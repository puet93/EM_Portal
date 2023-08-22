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
		<main>
			<div className="products-page">
				{data.products ? (
					<table>
						<tbody>
							<tr>
								<th className="caption">Description</th>
								<th className="caption">Vendor Item No.</th>
							</tr>
							{data.products.map((product) => (
								<tr key={product.id}>
									<td>
										<div className="title">
											{product.title}
										</div>
										<div className="caption">
											{product.sku}
										</div>
									</td>
									<td>{product.vendorProduct.itemNo}</td>
								</tr>
							))}
						</tbody>
					</table>
				) : null}
			</div>
		</main>
	);
}
