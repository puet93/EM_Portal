import type { ActionFunction } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import { getMetafields, graphqlClient } from '~/utils/shopify.server';
import { parseCSV } from '~/utils/csv';
import { splitMeasurement } from '~/utils/measure';
import fs from 'fs';
import crypto from 'crypto';
import {
	calculatePricePerCarton,
	unstable_splitSizeCell,
} from '~/utils/helpers';

export const action: ActionFunction = async ({ request }) => {
	// Get a list of products to sync from .csv file
	const handler = unstable_createMemoryUploadHandler();
	const formData = await unstable_parseMultipartFormData(request, handler);
	const file = formData.get('file') as File;
	const parsedCSV: any[] = await parseCSV(file);

	switch (request.method) {
		// Add new products from .csv files to Shopify. Existing products are ignored.
		case 'POST': {
			const data = parsedCSV.map((row) => {
				return {
					sku: row.sku,
					title: row.title || 'DEFAULT TITLE',
				};
			});

			// See if product might already exist
			const promises = data.map((row) => {
				const query = `{
					productVariants(first: 1, query: "sku:${row.sku}") {
					  edges {
						node {
						  id
						  sku
						  price
						  product {
							title
							hasOnlyDefaultVariant
						  }
						}
					  }
					}
				  }`;

				return new Promise((resolve) => {
					graphqlClient
						.query({ data: query })
						.then(
							(res) => res.body.data.productVariants.edges[0].node
						)
						.then((res) => resolve(res))
						.catch(() => {
							resolve({
								doesNotExist: true,
								sku: row.sku,
								title: row.title,
							});
						});
				});
			});

			const shopifyResponse = await Promise.all(promises);

			const newProducts = shopifyResponse.filter(
				(product) => product.doesNotExist === true
			);

			const productInputs: any[] = [];
			const filename = `bulk-op-vars-${crypto.randomUUID()}`;
			const filePath = `${__dirname}/tmp/${filename}.jsonl`;

			for (let i = 0; i < newProducts.length; i++) {
				const product = newProducts[i];

				if (product.doesNotExist) {
					const productInput = {
						input: {
							title: product.title,
							variants: [{ sku: product.sku }],
						},
					};
					productInputs.push(productInput);
					fs.appendFileSync(filePath, JSON.stringify(productInput));
					fs.appendFileSync(filePath, '\n');
				}
			}

			return json({ filename, productInputs });
		}
		// Update new products from .csv files to Shopify. Products that don't exist are ignored.
		case 'PUT': {
			const data = parsedCSV.map((row) => {
				// BASE MEASUREMENTS
				let measurementPerCarton;
				if (row.measurementPerCarton) {
					measurementPerCarton = splitMeasurement(
						row.measurementPerCarton
					);
				}

				// COLOR
				let color;
				if (row.color) {
					color = row.color;
				}

				// WEIGHT
				let weightPerCarton;
				if (row.weightPerCarton) {
					weightPerCarton = splitMeasurement(row.weightPerCarton);
				}

				// DIMENSIONS
				let dimensions;
				if (row.size) {
					dimensions = unstable_splitSizeCell(row.size);
				}

				if (row.thickness) {
					dimensions.thickness = splitMeasurement(row.thickness);
				}

				// TITLE
				let title;
				if (row.title) {
					title = row.title;
				}

				// PRICE
				let price;
				if (row.listPrice && measurementPerCarton.value) {
					price = calculatePricePerCarton(
						row.listPrice,
						0.45,
						0.445,
						1.7,
						measurementPerCarton.value
					);
				}

				return {
					sku: row.sku,
					title: title || null,
					description: row.description || null,
					price: price || null,
					color: color || null,
					dimensions: dimensions || null,
					measurementPerCarton: measurementPerCarton || null,
					weightPerCartonValue:
						weightPerCarton && weightPerCarton.value
							? weightPerCarton.value
							: null,
				};
			});

			const metafieldsDict = getMetafields();
			const metafieldKeys = [
				metafieldsDict.width.key,
				metafieldsDict.length.key,
				metafieldsDict.thickness.key,
				metafieldsDict.baseUom.key,
				metafieldsDict.basePrice.key,
				metafieldsDict.sellingMeasurementValue.key, // The 16 from '16 pieces'
			];
			const keys = JSON.stringify(metafieldKeys); // Used to build query

			// See if product might already exist
			const promises = data.map((row) => {
				const query = `{
					productVariants(first: 1, query: "sku:${row.sku}") {
					  edges {
						node {
						  id
						  sku
						  product {
							id
							title
							hasOnlyDefaultVariant
							metafields(first:${metafieldKeys.length}, keys:${keys}) {
								edges {
									node {
										id
										key
										value
										type
									}
								}
							}
						  }
						}
					  }
					}
				  }`;

				return new Promise((resolve) => {
					graphqlClient
						.query({ data: query })
						.then(
							(res) => res.body.data.productVariants.edges[0].node
						)
						.then((res) => {
							const metafields =
								res.product.metafields.edges.length !== 0
									? res.product.metafields.edges.map(
											(item) => item.node
									  )
									: null;

							resolve({
								id: res.product.id,
								title: row.title,
								color: row.color,
								dimensions: row.dimensions,
								measurementPerCarton: row.measurementPerCarton,
								metafields,
								variants: [
									{
										id: res.id,
										price: row.price,
										weight: row.weightPerCartonValue,
									},
								],
							});
						})
						.catch((e) => {
							resolve({
								errors: e.response.errors,
								doesNotExist: true,
								sku: row.sku,
								title: row.title,
							});
						});
				});
			});

			const shopifyResponse = await Promise.all(promises);
			const productsToUpdate = shopifyResponse.filter(
				(product) => product.doesNotExist !== true
			);

			/* ---------------- CREATE JSONL FILE ---------------- */

			const productInputs: any[] = [];
			const filename = `bulk-op-vars-${crypto.randomUUID()}`;
			const filePath = `${__dirname}/tmp/${filename}.jsonl`;

			/* ---------------- APPEND TO JSONL FILE ---------------- */

			for (let i = 0; i < productsToUpdate.length; i++) {
				const productResponse: {
					id: string;
					title: string;
					color: string;
					dimensions: {
						width: {
							value: string;
						};
						length: {
							value: string;
						};
						thickness: {
							value: string;
							unitOfMeasure: {
								name: string;
							};
						};
					};
					measurementPerCarton: {
						value: number;
						unitOfMeasure: {
							name: string;
							singular: string;
							abbreviation: string;
						};
					};
					metafields: any[];
					variants: [
						{
							id: string;
							price: string;
							weight: string;
						}
					];
				} = productsToUpdate[i];
				const input: {
					id: string;
					title?: string;
					variants?: any[];
					metafields?: any[];
				} = {
					id: productResponse.id,
				};

				// DESCRIPTION
				// if (productResponse.bodyHtml) {
				// 	// do something
				// }

				// TITLE
				if (productResponse.title) input.title = productResponse.title;

				const variants = [
					{
						id: productResponse.variants[0].id,
						price: productResponse.variants[0].price,
						weight: productResponse.variants[0].weight,
					},
				];

				// METAFIELDS
				const metafieldInputs = [];
				const { ...dimensions } = productResponse.dimensions;

				// WIDTH
				if (dimensions.width) {
					const metafield =
						productResponse.metafields &&
						productResponse.metafields.find(
							(metafield) =>
								metafield.key === metafieldsDict.width.key
						);

					if (metafield) {
						metafieldInputs.push({
							id: metafield.id,
							value: JSON.stringify({
								value: dimensions.width,
								unit: 'INCHES',
							}),
						});
					} else {
						// if the metafield does not already exist, create it
						metafieldInputs.push({
							namespace: 'custom',
							key: 'width',
							type: 'dimension',
							value: JSON.stringify({
								value: dimensions.width,
								unit: 'INCHES',
							}),
						});
					}
				}

				// LENGTH
				if (dimensions.length) {
					const metafield =
						productResponse.metafields &&
						productResponse.metafields.find(
							(metafield) =>
								metafield.key === metafieldsDict.length.key
						);

					if (metafield) {
						metafieldInputs.push({
							id: metafield.id,
							value: JSON.stringify({
								value: dimensions.length,
								unit: 'INCHES',
							}),
						});
					} else {
						metafieldInputs.push({
							namespace: 'custom',
							key: 'length',
							type: 'dimension',
							value: JSON.stringify({
								value: dimensions.length,
								unit: 'INCHES',
							}),
						});
					}
				}

				// THICKNESS
				if (dimensions.thickness) {
					const metafield =
						productResponse.metafields &&
						productResponse.metafields.find(
							(metafield) =>
								metafield.key === metafieldsDict.thickness.key
						);

					if (metafield) {
						metafieldInputs.push({
							id: metafield.id,
							value: JSON.stringify({
								value: dimensions.thickness.value,
								unit: dimensions.thickness.unitOfMeasure.name.toUpperCase(),
							}),
						});
					} else {
						metafieldInputs.push({
							namespace: 'custom',
							key: 'thickness',
							type: 'dimension',
							value: JSON.stringify({
								value: dimensions.thickness.value,
								unit: dimensions.thickness.unitOfMeasure.name.toUpperCase(),
							}),
						});
					}
				}

				// BASE UNIT OF MEASURE
				if (
					productResponse.measurementPerCarton &&
					productResponse.measurementPerCarton?.unitOfMeasure
				) {
					const { unitOfMeasure } =
						productResponse.measurementPerCarton;

					const metafield =
						productResponse.metafields &&
						productResponse.metafields.find(
							(metafield) =>
								metafield.key === metafieldsDict.baseUom.key
						);
					if (metafield) {
						metafieldInputs.push({
							id: metafield.id,
							value: unitOfMeasure.singular,
						});
					} else {
						metafieldInputs.push({
							namespace: 'unit',
							key: 'measure',
							type: metafieldsDict.baseUom.type,
							value: unitOfMeasure.singular,
						});
					}
				}

				// BASE PRICE
				if (
					productResponse.measurementPerCarton &&
					productResponse.variants[0].price
				) {
					const price = productResponse.variants[0].price;
					const { value } = productResponse.measurementPerCarton;
					const basePrice = Number(price) / value;
					const metafield =
						productResponse.metafields &&
						productResponse.metafields.find(
							(metafield) =>
								metafield.key === metafieldsDict.basePrice.key
						);

					if (metafield) {
						metafieldInputs.push({
							id: metafield.id,
							value: JSON.stringify({
								amount: basePrice.toFixed(2),
								currency_code: 'USD',
							}),
						});
					} else {
						metafieldInputs.push({
							namespace: 'unit',
							key: 'price',
							value: JSON.stringify({
								amount: basePrice.toFixed(2),
								currency_code: 'USD',
							}),
							type: metafieldsDict.basePrice.type,
						});
					}
				}

				// SELLING MEASUREMENT (i.e. square footage per box or pieces per box)
				if (productResponse.measurementPerCarton) {
					const { value } = productResponse.measurementPerCarton;
					const metafield =
						productResponse.metafields &&
						productResponse.metafields.find(
							(metafield) =>
								metafield.key ===
								metafieldsDict.sellingMeasurementValue.key
						);

					if (metafield) {
						metafieldInputs.push({
							id: metafield.id,
							value: JSON.stringify(value),
						});
					} else {
						metafieldInputs.push({
							namespace: 'unit',
							key: 'per_sales_unit',
							value: JSON.stringify(value),
							type: 'number_decimal',
						});
					}
				}

				// APPEND PROPERTIES TO PRODUCT INPUTS
				if (variants) input.variants = variants;
				if (metafieldInputs.length !== 0)
					input.metafields = metafieldInputs;

				const productInput = { input };
				productInputs.push(productInput);
				fs.appendFileSync(filePath, JSON.stringify(productInput));
				fs.appendFileSync(filePath, '\n');
			}

			return json({
				filename,
				productInputs,
			});
		}
		default:
			return json({ message: 'Unsupported request method' }, 405);
	}
};
