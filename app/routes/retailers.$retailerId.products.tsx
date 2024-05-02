import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import { Outlet } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { parseCSV } from '~/utils/csv';

export const action = async ({ params, request }: ActionFunctionArgs) => {
	await requireUserId(request);

	const handler = unstable_createMemoryUploadHandler();
	const formData = await unstable_parseMultipartFormData(request, handler);
	const file = formData.get('file') as File;
	const parsedCSV: any[] = await parseCSV(file);

	switch (request.method) {
		case 'POST': {
			const data: { sku: string; title: string; itemNo: string }[] =
				parsedCSV.map((row) => ({
					sku: row.sku,
					title: row.title || 'DEFAULT TITLE',
					itemNo: row.itemNo,
				}));
			const products = await prisma.$transaction(
				data.map(({ sku, title, itemNo }) => {
					return prisma.retailerProduct.create({
						data: {
							sku: sku,
							title: title,
							vendorProduct: {
								connect: {
									itemNo: itemNo,
								},
							},
						},
					});
				})
			);

			return json({ products });
		}
		case 'PUT': {
			const data: { sku: string; title: string }[] = parsedCSV.map(
				(row) => ({
					sku: row.sku,
					title: row.title,
				})
			);
			const products = await prisma.$transaction(
				data.map((product) => {
					return prisma.retailerProduct.update({
						where: {
							sku: product.sku,
						},
						data: {
							title: product.title,
						},
					});
				})
			);

			return json({ products });
		}
		default:
			return json({ message: 'Method not supported' }, 405);
	}
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	await requireUserId(request);
	const products = await prisma.retailerProduct.findMany({
		include: {
			vendorProduct: true,
		},
	});
	return json({ products });
};

export default function RetailerProductsPage() {
	return (
		<main className="main-content">
			<Outlet />
		</main>
	);
}
