import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import {
	Form,
	Link,
	Outlet,
	useActionData,
	useLoaderData,
} from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { parseCSV } from '~/utils/csv';
import { combineArrays, standardizeQueryString } from '~/utils/helpers';
import { badRequest } from '~/utils/request.server';
import { SearchIcon } from '~/components/Icons';

import Input from '~/components/Input';

export const loader = async ({ params, request }: LoaderArgs) => {
	await requireUserId(request);

	const searchParams = new URL(request.url).searchParams;
	const seriesName = searchParams.get('seriesName');
	const finish = searchParams.get('finish');
	const color = searchParams.get('color');
	const fields = { vendorId: params.vendorId };

	if (seriesName) {
		fields['seriesName'] = {
			contains: seriesName,
			mode: 'insensitive',
		};
	}

	if (finish) {
		fields['finish'] = {
			contains: finish,
			mode: 'insensitive',
		};
	}

	if (color) {
		fields['color'] = {
			contains: color,
			mode: 'insensitive',
		};
	}

	const products = await prisma.vendorProduct.findMany({
		where: fields,
		orderBy: { seriesName: 'asc' },
		include: {
			retailerProduct: true,
		},
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
					prisma.vendorProduct.findMany({
						where: {
							vendorId: vendor.id,
							color: {
								search: query,
							},
						},
						include: {
							retailerProduct: true,
						},
					}),
					prisma.vendorProduct.findMany({
						where: {
							vendorId: vendor.id,
							seriesName: {
								search: query,
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

			console.log('CSV', parsedCSV);

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
			<Link to="import">Import</Link>

			<Form method="post">
				<div className="search-bar">
					<SearchIcon className="search-icon" id="search-icon" />
					<input
						className="search-input"
						type="search"
						name="query"
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

			<Form method="get">
				<div
					style={{
						display: 'flex',
						alignItems: 'flex-end',
					}}
				>
					<Input id="series" label="Series" name="seriesName" />
					<Input id="color" label="Color" name="color" />
					<Input id="finish" label="finish" name="finish" />
					<button
						className="primary button"
						type="submit"
						name="_action"
						value="search"
						style={{ marginBottom: 20 }}
					>
						Search
					</button>

					<Link className="button" to="edit">
						Edit
					</Link>
				</div>
			</Form>

			{actionData?.formError ? (
				<div className="error message">{actionData.formError}</div>
			) : null}

			{actionData?.results ? (
				<>
					<p>
						{actionData.results.length === 1
							? `${actionData.results.length} result`
							: `${actionData.results.length} results`}
					</p>
					<table style={{ marginTop: '36px' }}>
						<thead>
							<tr>
								<th>Series</th>
								<th>Color</th>
								<th>Finish</th>
								<th>Description</th>
								<th>Item No.</th>
								<th>Sample</th>
								<th>SKU</th>
							</tr>
						</thead>
						<tbody>
							{actionData.results.map((product) => (
								<tr key={product.id}>
									<td>{product.seriesName}</td>
									<td>{product.color}</td>
									<td>{product.finish}</td>
									<td>
										<i>Description goes here</i>
									</td>
									<td>{product.itemNo}</td>
									<td>
										{product.sampleMaterialNo ? (
											product.sampleMaterialNo
										) : (
											<Link to={`${product.id}/samples`}>
												Connect
											</Link>
										)}
									</td>
									<td>
										{product.retailProduct?.sku
											? product.retailProduct.sku
											: 'No connected product.'}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</>
			) : null}

			{!actionData && data.products ? (
				<>
					<p>
						{data.products.length === 1
							? `${data.products.length} result`
							: `${data.products.length} results`}
					</p>
					<table style={{ marginTop: '36px' }}>
						<tbody>
							<tr>
								<th>Series</th>
								<th>Color</th>
								<th>Finish</th>
								<th>Description</th>
								<th>Item No.</th>
								<th>Sample</th>
								<th></th>
							</tr>

							{data.products.map((product) => (
								<tr key={product.id}>
									<td>{product.seriesName}</td>
									<td>{product.color}</td>
									<td>{product.finish}</td>
									<td>
										<i>Description goes here</i>
									</td>
									<td>{product.itemNo}</td>
									<td>
										{product.sampleMaterialNo ? (
											product.sampleMaterialNo
										) : (
											<Link
												to={`${product.id}/samples`}
												className="button"
											>
												Connect
											</Link>
										)}
									</td>
									{product.retailerProduct ? (
										<td>
											<Link
												to={`/products/${product.retailerProduct.id}`}
											>
												Connected
											</Link>
										</td>
									) : (
										<td></td>
									)}
								</tr>
							))}
						</tbody>
					</table>
				</>
			) : null}

			<Outlet />
		</>
	);
}
