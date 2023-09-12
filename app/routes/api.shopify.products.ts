import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import { graphqlClient } from '~/utils/shopify.server';
import { parseCSV } from '~/utils/csv';
import fs from 'fs';
import crypto from 'crypto';

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
		default:
			return json({ message: 'Unsupported request method' }, 405);
	}
};
