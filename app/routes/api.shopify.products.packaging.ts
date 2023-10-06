import type { ActionFunction } from '@remix-run/node';
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
		case 'POST': {
			const data = parsedCSV.map((row) => {
				return {
					sku: row.sku,
					piecesPerBox: row.piecesPerBox,
				};
			});

			// See if product might already exist
			const promises = data.map((row) => {
				const query = `{
					productVariants(first: 1, query: "sku:${row.sku}") {
					  edges {
						node {
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
						.then((res) => {
							if (
								res.body.data.productVariants.edges.length === 0
							) {
								console.log(
									`Product ${row.sku} does not exist.`
								);
								return resolve(null);
							} else {
								const node =
									res.body.data.productVariants.edges[0].node;

								return resolve({
									id: node.product.id,
									metafields: {
										key: 'pieces',
										namespace: 'selling_unit',
										type: 'number_integer',
										value: row.piecesPerBox,
									},
								});
							}
						})
						.catch((e) => {
							console.log(`ERROR: ${row.sku}`, e);
							resolve(null);
						});
				});
			});

			const shopifyResponse = await Promise.all(promises);
			const productInputs: any[] = [];
			const filename = `bulk-op-vars-${crypto.randomUUID()}`;
			const filePath = `${__dirname}/tmp/${filename}.jsonl`;

			for (let i = 0; i < shopifyResponse.length; i++) {
				const product = shopifyResponse[i];
				if (!product) continue;

				const productInput = {
					input: {
						id: product.id,
						metafields: product.metafields,
					},
				};
				productInputs.push(productInput);
				fs.appendFileSync(filePath, JSON.stringify(productInput));
				fs.appendFileSync(filePath, '\n');
			}

			return json({ filename, productInputs });
		}
		default:
			return json({ message: 'Unsupported request method' }, 405);
	}
};
