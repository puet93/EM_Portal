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
				'<p>Step into the world of elegance and luxury with Chantel, our marble look porcelain tile collection. Chantel, meaning stone in French, replicates natures most opulent stones but features the strength and durability benefits of porcelain. This collection is available in both matte and polished finishes, 4 neutral colors, 4 sizes (24x48, 24x24, 12x24 and 3x12) as well as a coordinating hexagon mosaic and herringbone mosaic. Elevate your home with the beauty of marble combined with the low-maintenance quality of color body porcelain. Enjoy the eye-catching allure of Chantel in your next residential or commercial project.</p>\n<ul>\n<li>Made in USA</li>\n<li>Made for Residential / Commercial Wall and Floor</li>\n<li>Great for Living Space, Kitchen, Bathroom and Shower</li>\n<li>Can Be Used Both Indoors and Outdoors with Proper Installation</li>\n<li>95% Local Sourced Materials Plus up to 45% Recycled Content</li>\n</ul>';
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
