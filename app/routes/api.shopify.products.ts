import type { ActionFunction } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import { graphqlClient } from '~/utils/shopify.server';
import { parseCSV } from '~/utils/csv';
import { splitMeasurement } from '~/utils/measure';
import fs from 'fs';
import crypto from 'crypto';

function calculatePricePerCarton(
	listPrice: number,
	factoryDiscount: number,
	margin: number,
	factor: number,
	measurementValue: number
): number {
	const cost = listPrice * (1 - factoryDiscount);
	const price = (cost / (1 - margin)) * factor * measurementValue;
	return Number(price.toFixed(2));
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
				const measurementPerCarton = splitMeasurement(
					row.measurementPerCarton
				);
				const weightPerCarton = splitMeasurement(row.weightPerCarton);

				return {
					sku: row.sku,
					title: row.title,
					price: calculatePricePerCarton(
						row.listPrice,
						0.45,
						0.445,
						1.7,
						measurementPerCarton.value
					),
					weightPerCartonValue: weightPerCarton.value,
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
							id
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
						.then((res) => {
							resolve({
								id: res.product.id,
								variants: [
									{
										id: res.id,
										price: row.price,
										weight: row.weightPerCartonValue,
									},
								],
							});
						})
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
			const productsToUpdate = shopifyResponse.filter(
				(product) => product.doesNotExist !== true
			);

			const productInputs: any[] = [];
			const filename = `bulk-op-vars-${crypto.randomUUID()}`;
			const filePath = `${__dirname}/tmp/${filename}.jsonl`;

			for (let i = 0; i < productsToUpdate.length; i++) {
				const product = productsToUpdate[i];
				const productInput = {
					input: {
						id: product.id,
						variants: [
							{
								id: product.variants[0].id,
								price: product.variants[0].price,
								weight: product.variants[0].weight,
							},
						],
					},
				};
				productInputs.push(productInput);
				fs.appendFileSync(filePath, JSON.stringify(productInput));
				fs.appendFileSync(filePath, '\n');
			}

			return json({
				filename,
				count: productsToUpdate.length,
				productsToUpdate,
			});
		}
		default:
			return json({ message: 'Unsupported request method' }, 405);
	}
};
