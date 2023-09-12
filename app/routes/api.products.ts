import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import { requireSuperAdmin } from '~/session.server';
import { prisma } from '~/db.server';
import { parseCSV } from '~/utils/csv';
import { badRequest } from '~/utils/request.server';

export const loader: LoaderFunction = async ({ request }) => {
	await requireSuperAdmin(request);

	const vendorProducts = await prisma.vendorProduct.findMany({
		where: {
			retailerProduct: null,
		},
	});

	return json({ count: vendorProducts.length, vendorProducts });
};

export const action: ActionFunction = async ({ request }) => {
	await requireSuperAdmin(request);

	switch (request.method) {
		// Bulk create products with a .csv file. Will not connect to vendor product.
		case 'POST': {
			const handler = unstable_createMemoryUploadHandler();
			const formData = await unstable_parseMultipartFormData(
				request,
				handler
			);

			const file = formData.get('file') as File;
			const parsedCSV: any[] = await parseCSV(file);
			const data = parsedCSV.map((row) => {
				return {
					sku: row.sku,
					title: row.title,
				};
			});

			const products = await prisma.retailerProduct.createMany({
				data: data.map((item) => ({
					sku: item.sku,
					title: item.title || 'DEFAULT TITLE',
				})),
				skipDuplicates: true,
			});

			return json({ products });
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
					return prisma.retailerProduct.create({
						data: {
							sku: item.sku,
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
