import type { ActionFunction } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import { requireSuperAdmin } from '~/session.server';
import { prisma } from '~/db.server';
import { parseCSV } from '~/utils/csv';
import { badRequest } from '~/utils/request.server';
import { graphqlClient } from '~/utils/shopify.server';
import fs from 'fs';
import crypto from 'crypto';

async function getProductVariants() {
	const data = `mutation {
		bulkOperationRunQuery(query: """
		{
			productVariants {
				edges {
					node {
						id
						sku
						product {
							id
							title
							tags
						}
					}
				}
			}
		}
		""") {
			bulkOperation {
				id
				status
			}
			userErrors {
				field
				message
			}
		}
	}`;
	const bulkOperationQuery = await graphqlClient.query({ data });

	if (
		bulkOperationQuery.body?.data.bulkOperationRunQuery.userErrors
			.length !== 0
	) {
		throw new Error();
	}

	return bulkOperationQuery.body?.data.bulkOperationRunQuery.bulkOperation;
}

export const action: ActionFunction = async ({ request }) => {
	await requireSuperAdmin(request);

	switch (request.method) {
		case 'POST': {
			const handler = unstable_createMemoryUploadHandler();
			const formData = await unstable_parseMultipartFormData(
				request,
				handler
			);

			const file = formData.get('file') as File;
			const parsedCSV: any[] = await parseCSV(file);
			const data = parsedCSV
				.filter((row) => row.tags)
				.map(({ sku, tags }) => ({ sku, tags: tags.split('|') }));

			// Get all product variants
			const bulkOperation = await getProductVariants();

			// TODO: Check to see if the query id matches the one on the status
			const bulkOperationStatusQuery = `query {
				currentBulkOperation {
					id
					status
					errorCode
					createdAt
					completedAt
					objectCount
					fileSize
					url
					partialDataUrl
				}
			}`;

			let url;
			let loopCount = 0;
			let records;

			do {
				const bulkOperationStatus = await graphqlClient.query({
					data: bulkOperationStatusQuery,
				});
				url = bulkOperationStatus.body?.data.currentBulkOperation.url;

				if (!url) {
					loopCount++;
					await new Promise((resolve, reject) => {
						setTimeout(() => {
							resolve('');
						}, 1000 * 5);
					});
					continue;
				}

				const response = await fetch(url);
				const text = await response.text();

				records = text
					.trim()
					.split('\n')
					.map((line) => JSON.parse(line));
			} while (!url && loopCount < 10);

			if (!records) return badRequest({ message: 'Unable to add tags' });

			const reducedArray = data.reduce((accumulator, item) => {
				const matchedRecord = records.find(
					(record) => record.sku === item.sku
				);
				if (!matchedRecord) {
					return accumulator;
				}
				// const mergedTags = [
				// 	...matchedRecord.product.tags,
				// 	...item.tags,
				// ];
				// const tags = [...new Set(mergedTags)].sort();
				// matchedRecord.product.tags = tags;
				accumulator.push({
					sku: matchedRecord.sku,
					id: matchedRecord.product.id,
					tags: item.tags,
				});
				return accumulator;
			}, []);

			const productInputs: any[] = [];
			const filename = `bulk-op-vars-${crypto.randomUUID()}`;
			const filePath = `${__dirname}/tmp/${filename}.jsonl`;
			reducedArray.map((product) => {
				const productInput = {
					input: {
						id: product.id,
						metafields: [
							{
								namespace: 'filter',
								key: 'application',
								type: 'list.single_line_text_field',
								value: JSON.stringify(product.tags),
							},
						],
					},
				};
				productInputs.push(productInput);
				fs.appendFileSync(filePath, JSON.stringify(productInput));
				fs.appendFileSync(filePath, '\n');
			});

			return json({
				filename,
				productInputs,
			});
		}
		case 'PUT': {
			const handler = unstable_createMemoryUploadHandler();
			const formData = await unstable_parseMultipartFormData(
				request,
				handler
			);

			const vendorId = formData.get('vendorId');

			if (typeof vendorId !== 'string' || vendorId.length === 0) {
				return badRequest({ error: 'Invalid vendorId.' });
			}

			const vendor = await prisma.vendor.findUnique({
				where: { id: vendorId },
			});

			if (!vendor) {
				return badRequest({
					error: 'Unable to locate the vendor with this ID.',
				});
			}

			const file = formData.get('file') as File;
			const parsedCSV: any[] = await parseCSV(file);
			const data = parsedCSV.map((row) => {
				return {
					sku: row.sku,
					title: row.title,
					itemNo: row.itemNo,
					vendorId: vendor.id,
				};
			});

			const retailerProduct = await prisma.$transaction(
				data.map((item) => {
					return prisma.retailerProduct.update({
						where: {
							sku: item.sku,
						},
						data: {
							title: item.title,
							vendorProduct: {
								connectOrCreate: {
									where: {
										itemNo: item.itemNo,
										vendorId: item.vendorId,
									},
									create: {
										itemNo: item.itemNo,
										vendorId: item.vendorId,
									},
								},
							},
						},
					});
				})
			);

			return json({
				count: retailerProduct.length,
				vendor,
				retailerProduct,
			});
		}
		default:
			return json({ error: 'Method not supported.' }, 405);
	}
};
