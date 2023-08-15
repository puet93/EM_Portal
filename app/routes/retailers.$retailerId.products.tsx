import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { parseCSV } from '~/utils/csv';
import { useLoaderData } from '@remix-run/react';

export const action = async ({ params, request }: ActionArgs) => {
	await requireUserId(request);

	const handler = unstable_createMemoryUploadHandler();
	const formData = await unstable_parseMultipartFormData(request, handler);
	const file = formData.get('file') as File;
	const parsedCSV: any[] = await parseCSV(file);
	const data: { sku: string; title: string; itemNo: string }[] =
		parsedCSV.map((row) => ({
			sku: row.sku,
			title: 'DEFAULT PRODUCT NAME',
			itemNo: row.itemNo,
		}));

	const syncedProducts = await prisma.$transaction(
		data.map((product) => {
			return prisma.retailerProduct.create({
				data: {
					sku: product.sku, // row.sku
					title: 'DEFAULT TITLE',
					vendorProduct: {
						connect: {
							itemNo: product.itemNo, // row.itemNo
						},
					},
				},
			});
		})
	);

	return json({ syncedProducts });
};

export const loader = async ({ params, request }: LoaderArgs) => {
	await requireUserId(request);
	const products = await prisma.retailerProduct.findMany({
		include: {
			vendorProduct: true,
		},
	});
	return json({ products });
};

export default function RetailerProductPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div>
			{data.products ? (
				<table>
					<tr>
						<th>SKU</th>
						<th>Vendor Item No.</th>
						<th>Description</th>
					</tr>
					{data.products.map((product) => (
						<tr key={product.id}>
							<td>{product.sku}</td>
							<td>{product.vendorProduct.itemNo}</td>
							<td>{product.title}</td>
						</tr>
					))}
				</table>
			) : null}
		</div>
	);
}
