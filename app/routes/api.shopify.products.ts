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

async function filterExistingProducts(data) {
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
						}
					}
				}
			}
		}`;

		return new Promise((resolve) => {
			graphqlClient
				.query({ data: query })
				.then((res) => res.body.data.productVariants.edges[0].node)
				.then((res) => resolve(res))
				.catch(() => {
					resolve({
						doesNotExist: true,
						...row,
					});
				});
		});
	});
	const shopifyResponse = await Promise.all(promises);
	const newProducts = shopifyResponse.filter(
		(product) => product.doesNotExist === true
	);
	return newProducts;
}

// TODO: Refactor
function getMetaobjectId(key: string): string {
	switch (key) {
		// Box or carton
		case 'BOX':
		case 'BX':
		case 'CTN':
			return 'gid://shopify/Metaobject/6387499226';
		// Crate
		case 'CRT':
			return 'gid://shopify/Metaobject/8284537050';
		// Pallet
		case 'PLT':
			return 'gid://shopify/Metaobject/8284504282';
		// Piece
		case 'PC':
		case 'PCS':
			return 'gid://shopify/Metaobject/6628344026';
		// Square Foot
		case 'FTX':
		case 'SF':
		case 'SQ FT':
			return 'gid://shopify/Metaobject/7368900826';
		default:
			throw new Error('Invalid Metaobject reference key.');
	}
}

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
					title: row.title || 'DEFAULT TITLE',
					sku: row.sku,
					price: row.price,
					weight: row.weight,
					color: row.color,
					finish: row.finish,
					sizeAndShape: row.sizeAndShape,
					width: row.width,
					length: row.length,
					thickness: row.thickness,
					pieces: row.pieces,
					basePrice: {
						value: row.basePriceValue, // base price / unit price (i.e. price per square foot)
						unitOfMeasure: row.basePriceUom, // base unit of measure / unit of measure (e.g. square foot)
					},
					surfaceArea: {
						value: row.surfaceAreaValue, // surface area value / units per sales unit (e.g. number of square feet per carton)
						unitOfMeasure: row.surfaceAreaUom, // surface area unit of measure
					},
					sellingUnitOfMeasure: 'Box', // Box: Metaobject<Unit of Measure>
					material: 'Porcelain',
				};
			});

			const newProducts = await filterExistingProducts(data);
			const productInputs: any[] = [];
			const filename = `bulk-op-vars-${crypto.randomUUID()}`;
			const filePath = `${__dirname}/tmp/${filename}.jsonl`;

			for (let i = 0; i < newProducts.length; i++) {
				const product = newProducts[i];

				if (product.doesNotExist) {
					const productInput = {
						input: {
							status: 'DRAFT',
							title: product.title,
							metafields: [
								{
									namespace: 'selling_unit',
									key: 'base_price',
									type: 'money',
									value: JSON.stringify({
										amount: Number(product.basePrice.value),
										currency_code: 'USD',
									}),
								},
								{
									namespace: 'selling_unit',
									key: 'base_uom',
									type: 'metaobject_reference',
									value: getMetaobjectId(
										product.basePrice.unitOfMeasure
									),
								},
								{
									namespace: 'selling_unit',
									key: 'pieces',
									type: 'number_integer',
									value: product.pieces,
								},
								{
									namespace: 'selling_unit',
									key: 'uom',
									type: 'metaobject_reference',
									value: getMetaobjectId('BOX'),
								},

								{
									namespace: 'selling_unit',
									key: 'surface_area_value',
									type: 'number_decimal',
									value: product.surfaceArea.value,
								},
								{
									namespace: 'selling_unit',
									key: 'surface_area_uom',
									type: 'metaobject_reference',
									value: getMetaobjectId(
										product.surfaceArea.unitOfMeasure
									),
								},
								{
									namespace: 'custom', // color
									key: 'variation_value',
									type: 'single_line_text_field',
									value: product.color,
								},
								{
									namespace: 'custom',
									key: 'finish',
									type: 'single_line_text_field',
									value: product.finish,
								},
								{
									namespace: 'size_and_shape',
									key: 'variation_value',
									type: 'single_line_text_field',
									value: product.sizeAndShape,
								},
								{
									namespace: 'filters',
									key: 'material',
									type: 'list.single_line_text_field',
									value: JSON.stringify(['Porcelain']),
								},
								{
									namespace: 'custom',
									key: 'width',
									type: 'dimension',
									value: JSON.stringify({
										value: Number(product.width),
										unit: 'INCHES',
									}),
								},
								{
									namespace: 'custom',
									key: 'length',
									type: 'dimension',
									value: JSON.stringify({
										value: Number(product.length),
										unit: 'INCHES',
									}),
								},
								{
									namespace: 'custom',
									key: 'thickness',
									type: 'dimension',
									value: JSON.stringify({
										value: Number(product.thickness),
										unit: 'MILLIMETERS',
									}),
								},

								{
									namespace: 'unit',
									key: 'per_sales_unit',
									type: 'number_decimal',
									value: product.surfaceArea.value,
								},
								{
									namespace: 'unit',
									key: 'measure',
									type: 'single_line_text_field',
									value:
										product.basePrice.unitOfMeasure === 'PC'
											? 'piece'
											: 'sq ft',
								},
								{
									namespace: 'unit',
									key: 'price',
									type: 'money',
									value: JSON.stringify({
										amount: Number(product.basePrice.value),
										currency_code: 'USD',
									}),
								},
							],
							vendor: 'Edward Martin',
							variants: [
								{
									inventoryItem: {
										tracked: true,
									},
									inventoryPolicy: 'CONTINUE',
									price: Number(product.price),
									sku: product.sku,
									weight: Number(product.weight),
									weightUnit: 'POUNDS',
								},
							],
						},
					};
					productInputs.push(productInput);
					fs.appendFileSync(filePath, JSON.stringify(productInput));
					fs.appendFileSync(filePath, '\n');
				}
			}

			return json({
				filename,
				count: productInputs.length,
				productInputs,
			});
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
