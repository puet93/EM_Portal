import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { parseCSV } from '~/utils/csv';

export const action = async ({ params, request }: ActionArgs) => {
	await requireUserId(request);

	const vendor = await prisma.vendor.findUnique({
		where: { id: params.vendorId },
	});

	if (!vendor) {
		return json({ message: 'Unable to locate vendor.' }, 500);
	}

	const handler = unstable_createMemoryUploadHandler();
	const formData = await unstable_parseMultipartFormData(request, handler);
	const file = formData.get('file') as File;
	const parsedCSV: any[] = await parseCSV(file);
	const data: { itemNo: string; listPrice: number; vendorId: string }[] =
		parsedCSV.map((row) => ({
			itemNo: row.itemNo,
			listPrice: row.listPrice,
			vendorId: vendor.id,
		}));

	const vendorProducts = await prisma.$transaction(
		data.map((item) => {
			return prisma.vendorProduct.upsert({
				where: {
					itemNo: item.itemNo,
					vendor,
				},
				update: {
					itemNo: item.itemNo,
					listPrice: item.listPrice,
				},
				create: {
					itemNo: item.itemNo,
					listPrice: item.listPrice,
					vendorId: vendor.id,
				},
			});
		})
	);

	return json({
		count: vendorProducts.length,
		vendor,
		vendorProducts,
	});
};

export const loader = async ({ params, request }: LoaderArgs) => {
	await requireUserId(request);
	const products = await prisma.vendorProduct.findMany({
		where: { vendorId: params.vendorId },
	});
	return json({ products });
};
