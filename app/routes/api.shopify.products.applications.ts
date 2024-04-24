import type { ActionFunction } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import { requireSuperAdmin } from '~/session.server';
import { parseCSV } from '~/utils/csv';
import { badRequest } from '~/utils/request.server';
import { graphqlClient } from '~/utils/shopify.server';
import fs from 'fs';
import crypto from 'crypto';

const foobar = `mutation {
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
						metafields(first: 2, keys: ["filter.application", "application.commercial"]) {
							edges {
								node {
									id
									namespace
									key
									type
									value
								}
							}
						}
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
							legacyResourceId
							metafields(first: 2, keys: ["filter.application", "application.commercial"]) {
							  	edges {
									node {
										id
										namespace
										key
										type
										value
									}
							  	}
							}
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
		// TODO: Remove POST after PATCH is fixed
		case 'POST': {
			const handler = unstable_createMemoryUploadHandler();
			const formData = await unstable_parseMultipartFormData(
				request,
				handler
			);

			const file = formData.get('file') as File;
			const parsedCSV: any[] = await parseCSV(file);
			const data = parsedCSV
				// .filter((row) => row.tags)
				.map(({ sku, residential, commercial }) => ({
					sku,
					residential: residential.split('|'),
					commercial: commercial.split('|'),
				}));

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

			if (!records)
				return badRequest({
					message: 'Unable to add to application chart',
				});

			const reducedArray = data.reduce((accumulator, item) => {
				const matchedRecord = records.find(
					(record) => record.sku === item.sku
				);
				if (!matchedRecord) {
					return accumulator;
				}
				accumulator.push({
					sku: matchedRecord.sku,
					id: matchedRecord.product.id,
					residentialApplications: item.residential,
					commercialApplications: item.commercial,
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
								value: JSON.stringify(
									product.residentialApplications
								),
							},
							{
								namespace: 'application',
								key: 'commercial',
								type: 'list.single_line_text_field',
								value: JSON.stringify(
									product.commercialApplications
								),
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
		// TODO: Remove PUT is fixed
		case 'PUT': {
			const handler = unstable_createMemoryUploadHandler();
			const formData = await unstable_parseMultipartFormData(
				request,
				handler
			);

			const file = formData.get('file') as File;
			const parsedCSV: any[] = await parseCSV(file);
			const data = parsedCSV.map(({ sku, residential, commercial }) => ({
				sku,
				residential: residential.split('|'),
				commercial: commercial.split('|'),
			}));

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

			if (!records) {
				return badRequest({
					message: 'Unable to add to application chart',
				});
			}

			return json({ records });

			const reducedArray = data.reduce((accumulator, item) => {
				const matchedRecord = records.find(
					(record) => record.sku === item.sku
				);
				if (!matchedRecord) {
					return accumulator;
				}

				// accumulator.push({
				// 	sku: matchedRecord.sku,
				// 	id: matchedRecord.product.id,
				// 	residentialApplications: item.residential,
				// 	commercialApplications: item.commercial,
				// });

				console.log('MATCHED RECORD', matchedRecord);
				const metafields = matchedRecord.product.metafields;

				// if (metafields) {
				// 	accumulator.push({
				// 		sku: matchedRecord.sku,
				// 		id: matchedRecord.product.id,
				// 		metafields: {
				// 			residentialApplication: {
				// 				id: "" // metafield.id,
				// 				values: ''
				// 			},
				// 			commercialApplication: {
				// 				id: "" // metafield.id,
				// 				values: ''
				// 			}
				// 		},
				// 	});
				// }
				// else {
				// 	accumulator.push({
				// 		sku: matchedRecord.sku,
				// 		id: matchedRecord.product.id,
				// 		residentialApplication: item.residential,
				// 		commercialApplication: item.commercial,
				// 	});
				// }

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
								id: product.metafields.residentialApplication
									.id,
								value: JSON.stringify(
									product.metafields.residentialApplication
										.values
								),
							},
							{
								id: product.metafields.commercialApplication.id,
								value: JSON.stringify(
									product.metafields.commercialApplication
										.values
								),
							},
							// {
							// 	namespace: 'filter',
							// 	key: 'application',
							// 	type: 'list.single_line_text_field',
							// 	value: JSON.stringify(
							// 		product.residentialApplications
							// 	),
							// },
							// {
							// 	namespace: 'application',
							// 	key: 'commercial',
							// 	type: 'list.single_line_text_field',
							// 	value: JSON.stringify(
							// 		product.commercialApplications
							// 	),
							// },
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
		// PATCH should be the only valid method, but PUT seems to be closest to completion
		case 'PATCH': {
			const handler = unstable_createMemoryUploadHandler();
			const formData = await unstable_parseMultipartFormData(
				request,
				handler
			);

			const file = formData.get('file') as File;
			const parsedCSV: any[] = await parseCSV(file);
			const data = parsedCSV
				// .filter((row) => row.tags)
				.map(({ sku, residential, commercial }) => ({
					sku,
					residential: residential.split('|'),
					commercial: commercial.split('|'),
				}));

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

			const reducedArray = data.reduce((accumulator: any, item) => {
				const matchedRecord = records.find(
					(record) => record.sku === item.sku
				);

				if (!matchedRecord) {
					return accumulator;
				}

				const metafield = matchedRecord.product.metafield;
				if (metafield) {
					accumulator.push({
						sku: matchedRecord.sku,
						id: matchedRecord.product.id,
						metafield: {
							id: metafield.id,
						},
						tags: item.tags,
					});
				} else {
					accumulator.push({
						sku: matchedRecord.sku,
						id: matchedRecord.product.id,
						tags: item.tags,
					});
				}

				return accumulator;
			}, []);

			const productInputs: any[] = [];
			const filename = `bulk-op-vars-${crypto.randomUUID()}`;
			const filePath = `${__dirname}/tmp/${filename}.jsonl`;

			for (const product of reducedArray) {
				let productInput;
				if (product.metafield) {
					productInput = {
						input: {
							id: product.id,
							metafields: [
								{
									id: product.metafield.id,
									value: JSON.stringify(product.tags),
								},
							],
						},
					};
				} else {
					productInput = {
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
				}
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
			return json({ error: 'Method not supported.' }, 405);
	}
};
