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
		case 'PUT': {
			const data = parsedCSV.map(({ sku, title, color }) => {
				return {
					sku,
					title,
					color,
				};
			});

			const promises = data.map((row) => {
				const query = `{
					productVariants(first: 1, query: "sku:${row.sku}") {
					  	edges {
							node {
						  		sku
						  		product {
									id
									title
									metafields(first: 1, keys: ["custom.variation_value"]) {
										edges {
										  node {
											id
											key
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
						.then((res) =>
							resolve({
								id: res.product.id,
								title: row.title,
								color: row.color,
								metafields: res.product.metafields.edges.map(
									(item) => item.node
								),
							})
						);
				});
			});

			const shopifyResponse = await Promise.all(promises);
			const productInputs: any[] = [];
			const filename = `bulk-op-vars-${crypto.randomUUID()}`;
			const filePath = `${__dirname}/tmp/${filename}.jsonl`;

			for (let i = 0; i < shopifyResponse.length; i++) {
				const product = shopifyResponse[i];
				const productInput = {
					input: {
						id: product.id,
						title: product.title,
						handle: '',
					},
				};

				// METAFIELDS
				const metafieldInputs = [];

				// COLOR
				if (product.color) {
					const metafield =
						product.metafields &&
						product.metafields.find(
							(item) => item.key === 'custom.variation_value'
						);

					if (metafield) {
						metafieldInputs.push({
							id: metafield.id,
							value: product.color,
						});
					} else {
						metafieldInputs.push({
							namespace: 'custom',
							key: 'variation_value',
							type: 'single_line_text_field',
							value: product.color,
						});
					}
				}

				if (metafieldInputs.length > 0) {
					productInput.input.metafields = metafieldInputs;
				}

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
