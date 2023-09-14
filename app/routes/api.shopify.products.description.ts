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
					description: row.description,
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
						.then((res) =>
							resolve({
								...res,
								id: res.product.id,
								descriptionHtml: row.description,
							})
						);
				});
			});

			const shopifyResponse = await Promise.all(promises);
			console.log(shopifyResponse);
			const productInputs: any[] = [];
			const filename = `bulk-op-vars-${crypto.randomUUID()}`;
			const filePath = `${__dirname}/tmp/${filename}.jsonl`;

			for (let i = 0; i < shopifyResponse.length; i++) {
				const product = shopifyResponse[i];

				const productInput = {
					input: {
						id: product.id,
						descriptionHtml:
							'<p>Introducing Tatum, a porcelain tile collection that emulates the beauty of travertine with an earth tone palette complementary of nearly every finish or color. This material warms up any space with a choice of two organic textures inspired by the different cutting techniques. Cross-cut, which emphasizes the cloud like patterns that make this natural material unique, and vein-cut, highlighting the linear lines of veining. Often used to evoke calm and serenity, Tatum is a timeless travertine look that will stay on trend for centuries.</p>\n<ul>\n<li>Made in USA</li>\n<li>Made for Residential / Commercial Wall and Floor</li>\n<li>Great for Living Space, Kitchen, Bathroom and Shower</li>\n<li>Can Be Used Both Indoors and Outdoors with Proper Installation</li>\n<li>95% Local Sourced Materials Plus up to 45% Recycled Content</li>\n</ul>',
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
