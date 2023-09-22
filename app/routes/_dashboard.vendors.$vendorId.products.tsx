import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { parseCSV } from '~/utils/csv';
import { useLoaderData } from '@remix-run/react';
import { combineArrays, standardizeQueryString } from '~/utils/helpers';
import { badRequest } from '~/utils/request.server';
import { SearchIcon } from '~/components/Icons';

import FileDropInput from '~/components/FileDropInput';

export const loader = async ({ params, request }: LoaderArgs) => {
	await requireUserId(request);
	const products = await prisma.vendorProduct.findMany({
		where: { vendorId: params.vendorId },
	});
	return json({ products });
};

export const action = async ({ params, request }: ActionArgs) => {
	await requireUserId(request);

	const vendor = await prisma.vendor.findUnique({
		where: { id: params.vendorId },
	});

	if (!vendor) {
		return badRequest({ formError: 'Unable to locate vendor.' });
	}

	const formData = await request.formData();
	const _action = formData.get('_action');

	switch (_action) {
		case 'search': {
			const searchQuery = formData.get('query');

			if (typeof searchQuery !== 'string' || searchQuery.length === 0) {
				return badRequest({
					formError: 'Please enter something in the search field.',
				});
			}

			const query = standardizeQueryString(searchQuery);

			try {
				const transactions = await prisma.$transaction([
					prisma.vendorProduct.findMany({
						where: {
							vendorId: vendor.id,
							itemNo: { search: query },
						},
						include: {
							retailerProduct: true,
						},
					}),
					prisma.vendorProduct.findMany({
						where: {
							vendorId: vendor.id,
							retailerProduct: {
								sku: {
									search: query,
								},
							},
						},
						include: {
							retailerProduct: true,
						},
					}),
				]);

				const results = combineArrays(transactions);

				if (results.length === 0) {
					return badRequest({ formError: 'No results found.' });
				}

				return json({ formError: null, results });
			} catch (e) {
				return badRequest({ formError: 'penis' });
			}
		}
		case 'update': {
			const handler = unstable_createMemoryUploadHandler();
			const formData = await unstable_parseMultipartFormData(
				request,
				handler
			);
			const file = formData.get('file') as File;
			const parsedCSV: any[] = await parseCSV(file);
			// const data: {
			// 	itemNo: string;
			// 	listPrice: number;
			// 	vendorId: string;
			// }[] = parsedCSV.map((row) => ({
			// 	itemNo: row.itemNo,
			// 	listPrice: row.listPrice,
			// 	vendorId: vendor.id,
			// }));

			// const vendorProducts = await prisma.$transaction(
			// 	data.map((item) => {
			// 		return prisma.vendorProduct.upsert({
			// 			where: {
			// 				itemNo: item.itemNo,
			// 				vendor,
			// 			},
			// 			update: {
			// 				itemNo: item.itemNo,
			// 				listPrice: item.listPrice,
			// 			},
			// 			create: {
			// 				itemNo: item.itemNo,
			// 				listPrice: item.listPrice,
			// 				vendorId: vendor.id,
			// 			},
			// 		});
			// 	})
			// );

			return badRequest({ formError: 'Not yet implemented.' });
		}
		default:
			return badRequest({ formError: 'Unsupported action.' });
	}
};

export default function VendorProductsPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	return (
		<>
			<Form method="post">
				<div className="search-bar">
					<SearchIcon className="search-icon" id="search-icon" />
					<input
						className="search-input"
						type="search"
						name="query"
						defaultValue="Aniston 12x24"
					/>
					<button
						className="primary button"
						type="submit"
						name="_action"
						value="search"
					>
						Search
					</button>
				</div>
			</Form>

			<Form method="post">
				<FileDropInput />
				<button type="submit">Update</button>
			</Form>

			{actionData?.formError ? (
				<div className="error message">{actionData.formError}</div>
			) : null}

			{actionData?.results ? (
				<table style={{ marginTop: '36px' }}>
					<tbody>
						<tr>
							<th>Description</th>
							<th>Price</th>
						</tr>

						{actionData.results.map((product) => (
							<tr key={product.id}>
								<td>{product.itemNo}</td>
							</tr>
						))}
					</tbody>
				</table>
			) : null}

			{!actionData && data.products ? (
				<table style={{ marginTop: '36px' }}>
					<tbody>
						<tr>
							<th>Description</th>
							<th>Price</th>
						</tr>

						{data.products.map((product) => (
							<tr key={product.id}>
								<td>{product.itemNo}</td>
								<td>{product.listPrice}</td>
							</tr>
						))}
					</tbody>
				</table>
			) : null}
		</>
	);
}
