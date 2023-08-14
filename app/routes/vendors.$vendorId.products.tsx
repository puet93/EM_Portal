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

	const vendorId = params.vendorId;
	const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });

	const handler = unstable_createMemoryUploadHandler();
	const formData = await unstable_parseMultipartFormData(request, handler);
	const file = formData.get('file') as File;
	const parsedCSV: any[] = await parseCSV(file);
	const data: { itemNo: string; vendorId: string }[] = parsedCSV.map(
		(row) => ({
			itemNo: row.itemNo as string,
			vendorId: row.vendorId as string,
		})
	);

	return json({
		vendor,
		products: await prisma.vendorProduct.createMany({ data }),
	});
};

export const loader = async ({ params, request }: LoaderArgs) => {
	await requireUserId(request);
	const products = await prisma.vendorProduct.findMany({
		where: { vendorId: params.vendorId },
	});
	return json({ products });
};
