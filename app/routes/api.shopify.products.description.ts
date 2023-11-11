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
			const descriptionHtml =
				'<p>Meet Wesley, a rustic stone porcelain tile collection perfect for your modern farmhouse. This collection takes a classic stone look and pairs it with a neo-industrial cement to create a contemporary natural stone expression. Wesley is available in 4 colors, 2 matte sizes (12x12 and 12x24) and 1 complimentary 2x2 mosaic. Pair this floor and wall tile with reclaimed wood, shiplap or antique wood furniture for the cozy, warm and inviting farmhouse of your dreams.</p>\n<ul>\n<li>Made in USA</li>\n<li>Made for Residential / Commercial Wall and Floor</li>\n<li>Great for Living Space, Kitchen, Bathroom and Shower</li>\n<li>Can Be Used Both Indoors and Outdoors with Proper Installation</li>\n<li>95% Local Sourced Materials Plus up to 45% Recycled Content</li>\n</ul>';
			const data = parsedCSV.map((row) => {
				return {
					sku: row.sku,
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
							descriptionHtml
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
								...res,
								id: res.product.id,
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
						descriptionHtml,
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
