import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { parseCSV } from '~/utils/csv';
import { combineArrays, standardizeQueryString } from '~/utils/helpers';
import { badRequest } from '~/utils/request.server';
import { fetchLocations } from '~/utils/shopify.server';

import { Button } from '~/components/Buttons';
import { Input, Label, Select } from '~/components/Input';

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	await requireUserId(request);

	let locations = [];
	try {
		locations = await fetchLocations();
	} catch (e) {
		console.log(e);
	}

	const vendor = await prisma.vendor.findUnique({
		where: { id: params.vendorId },
	});

	if (!vendor) {
		throw new Error('Unable to find vendor');
	}

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
		orderBy: [{ seriesName: 'asc' }, { itemNo: 'asc' }],
		include: {
			retailerProduct: true,
			sample: true,
		},
	});

	return json({ vendor, products, locations });
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
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
				return badRequest({
					formError: 'There was a problem querying the database.',
				});
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
		case 'update_location': {
			const locationId = formData.get('locationId');
			await prisma.vendor.update({
				where: { id: params.vendorId },
				data: { shopifyLocationId: locationId },
			});
		}
		default:
			return badRequest({ formError: 'Unsupported action.' });
	}
};

export default function VendorProductsPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<>
			<header className="page-header">
				<div className="page-header__row">
					<h1>Vendor Products</h1>

					<div className="page-header__actions">
						<Link className="primary button" to="products/import">
							Import
						</Link>
					</div>
				</div>
				<div className="page-header__row">{data.vendor.name}</div>
			</header>

			<div className="page-layout">
				{data.locations.length > 0 ? (
					<Form
						method="post"
						className="flex items-end gap-x-3"
						replace
					>
						<div>
							<Label htmlFor="locationId">Shopify location</Label>

							<div className="mt-2">
								<Select
									id="locationId"
									name="locationId"
									options={data.locations.map(
										(location: {
											id: string;
											name: string;
										}) => ({
											value: location.id,
											label: location.name,
										})
									)}
									hasBlankOption
									defaultValue={
										data.vendor.shopifyLocationId || ''
									}
								/>
							</div>
						</div>

						<Button
							type="submit"
							name="_action"
							value="update_location"
							color="primary"
						>
							Update Location
						</Button>
					</Form>
				) : null}

				<Form method="get" replace>
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
							Filter
						</button>
					</div>
				</Form>

				{data.products ? (
					<>
						<p>
							{data.products.length === 1
								? `${data.products.length} result`
								: `${data.products.length} results`}
						</p>
						<table style={{ marginTop: '36px' }}>
							<tbody>
								<tr>
									<th>{data.vendor.name}</th>
									<th>Edward Martin</th>
									<th>Sample Swatch</th>
								</tr>

								{data.products.map((product) => {
									let vendorProductTitle = product.seriesName;
									if (product.finish) {
										vendorProductTitle += ` ${product.finish}`;
									}
									if (product.color) {
										vendorProductTitle += ` ${product.color}`;
									}

									return (
										<tr key={product.id}>
											<td>
												<Link
													to={`/vendors/${data.vendor.id}/products/${product.id}`}
												>
													<div className="title">
														{vendorProductTitle}
													</div>
													<div className="caption">
														{product.itemNo}
													</div>
												</Link>
											</td>
											<td>
												{product.retailerProduct ? (
													<Link
														to={`/products/${product.retailerProduct?.id}`}
													>
														<div className="title">
															{
																product
																	.retailerProduct
																	.title
															}
														</div>
														<div className="caption">
															{
																product
																	.retailerProduct
																	.sku
															}
														</div>
													</Link>
												) : (
													'Unable to find related product'
												)}
											</td>
											<td>
												{product.sampleMaterialNo &&
												product.sample ? (
													<Link
														to={`/samples/${product.sample.id}`}
													>
														{
															product.sampleMaterialNo
														}
													</Link>
												) : (
													<Link
														to={`${product.id}/samples`}
														className="button"
													>
														Connect
													</Link>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</>
				) : null}
			</div>
		</>
	);
}
