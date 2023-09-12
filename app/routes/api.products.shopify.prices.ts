import type { ActionArgs, LoaderFunction } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import { graphqlClient } from '~/utils/shopify.server';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import fs from 'fs';
import crypto from 'crypto';

export const loader: LoaderFunction = async ({ request }) => {
	await requireUserId(request);
	return json({ products: await prisma.retailerProduct.findMany() });
};

export const action = async ({ params, request }: ActionArgs) => {
	await requireUserId(request);

	switch (request.method) {
		// UPDATES pricing on the data base
		case 'PUT': {
			const vendorProducts = await prisma.vendorProduct.findMany({
				where: {
					vendorId: params.vendorId,
					retailerProduct: { isNot: null },
				},
				select: {
					id: true,
					itemNo: true,
					listPrice: true,
					measurement: {
						select: {
							value: true,
							unitOfMeasure: true,
						},
					},
					retailerProduct: true,
				},
			});

			const discount = 1 - 0.35;
			const margin = 1 - 0.445;
			const productsToUpdate = vendorProducts.map((vendorProduct) => {
				const costPerUom = vendorProduct.listPrice * discount;
				const cost = costPerUom * vendorProduct.measurement.value;
				const price = (cost / margin) * 1.7;
				const priceRoundedUp = Math.round(price * 100) / 100;
				const product = {
					...vendorProduct.retailerProduct,
					price: priceRoundedUp,
				};

				return product;
			});

			const updated = await prisma.$transaction(
				productsToUpdate.map((product) => {
					return prisma.retailerProduct.update({
						where: { id: product.id },
						data: {
							price: product.price,
						},
					});
				})
			);

			return json({ updated });
		}
		case 'POST': {
			const retailerProducts = await prisma.retailerProduct.findMany({
				take: 10,
			});
			const promises = retailerProducts.map((row) => {
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

				return new Promise((resolve, reject) => {
					graphqlClient
						.query({ data: query })
						.then(
							(res) => res.body.data.productVariants.edges[0].node
						)
						.then((res) =>
							resolve({
								...res,
								price: row.price,
								oldPrice: res.price,
							})
						)
						.catch(() => {
							console.log(`Product ${row.sku} not found.`);
							reject({ notFound: true });
						});
				});
			});

			const shopifyProducts = await Promise.all(promises);
			const productVariantInputs: any[] = [];
			const filename = `bulk-op-vars-${crypto.randomUUID()}`;
			const filePath = `${__dirname}/tmp/${filename}.jsonl`;

			for (let i = 0; i < shopifyProducts.length; i++) {
				const productVariantInput = {
					input: {
						id: shopifyProducts[i].id,
						price: shopifyProducts[i].price,
					},
				};

				// Write to file
				productVariantInputs.push(productVariantInput);
				fs.appendFileSync(
					filePath,
					JSON.stringify(productVariantInput)
				);
				fs.appendFileSync(filePath, '\n');
			}

			return json({ filename, productVariantInputs, shopifyProducts });
		}

		default:
			return json({ message: 'Method not supported.' });
	}
};

// Get a file that allows me to sync products on the database to products on Shopify

// product/shopify/sync
