import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import {
	Form,
	Link,
	Outlet,
	useActionData,
	useLoaderData,
} from '@remix-run/react';
import { prisma } from '~/db.server';
import { requireUserId } from '~/session.server';
import { badRequest } from '~/utils/request.server';
import Input from '~/components/Input';
import { graphqlClient } from '~/utils/shopify.server';

export const loader: LoaderFunction = async ({ params, request }) => {
	await requireUserId(request);

	const searchParams = new URL(request.url).searchParams;
	const entries = Object.fromEntries(searchParams);
	const query = entries.query;

	const sample = await prisma.sample.findFirst({
		where: { id: params.sampleId },
	});

	if (!sample) return badRequest({ message: 'Unable to find sample.' });

	const connected = await prisma.vendorProduct.findMany({
		where: {
			sampleMaterialNo: sample.materialNo,
		},
		include: {
			vendor: true,
			retailerProduct: true,
		},
	});

	let vendorProducts;
	if (query) {
		vendorProducts = await prisma.vendorProduct.findMany({
			where: {
				seriesName: {
					contains: query,
					mode: 'insensitive',
				},
				sampleMaterialNo: null,
			},
			include: {
				vendor: true,
			},
		});
	} else {
		vendorProducts = await prisma.vendorProduct.findMany({
			where: {
				seriesName: {
					contains: sample.seriesName,
					mode: 'insensitive',
				},
				color: {
					contains: sample.color,
					mode: 'insensitive',
				},
				sampleMaterialNo: null,
			},
			include: {
				vendor: true,
			},
		});
	}

	return json({ connected, vendorProducts, sample });
};

export const action: ActionFunction = async ({ params, request }) => {
	await requireUserId(request);

	const formData = await request.formData();
	const { _action, ...fields } = Object.fromEntries(formData);
	// const entries = Object.fromEntries(formData);
	// const values = Object.entries(entries);
	// const vendorProductIds = [];
	// const { _action, ...fields } = values;

	switch (_action) {
		case 'sync':
			const sample = await prisma.sample.findUnique({
				where: { id: params.sampleId },
			});

			if (!sample) {
				return badRequest({
					errors: ['Unable to locate sample in database.'],
				});
			}

			let shopifyResponse;
			try {
				shopifyResponse = await graphqlClient.query({
					data: `
						{
							productVariants(first: 10, query: "sku:${sample.materialNo}") {
								edges {
									node {
										product {
											id
											title
										}
									}
								}
							}
						}
					`,
				});
			} catch (e) {
				return badRequest({
					errors: ['Unable to query Shopify for sample product.'],
				});
			}

			const responseBody = shopifyResponse.body;
			if (!responseBody) {
				return badRequest({
					message: 'Unable to get product on Shopify',
				});
			}

			const existingSamples = responseBody.data?.productVariants?.edges;
			const productExists = existingSamples.length !== 0;

			if (!productExists) {
				const newShopifyProduct = await graphqlClient.query({
					data: `
						mutation productCreate {
							productCreate(input: {
								title: "${fields.title}",
								status: DRAFT,
								tags: ["sample"],
								templateSuffix: "sample",
								variants: [{ sku: "${sample.materialNo}" }]
							}) {
								product {
									id
									title
									tags
									status
									vendor
									templateSuffix
									variants(first: 1) {
										edges {
											node {
												id
												title
											}
										}
									}
								}
								userErrors {
									field
									message
								}
							}
						}
					`,
				});

				await prisma.sample.update({
					where: { id: sample.id },
					data: {
						gid: newShopifyProduct.body.data.productCreate.product
							.id,
					},
				});

				return json({ message: 'Sample created on Shopify.' });
			}

			if (productExists && existingSamples.length === 1) {
				const product = existingSamples[0].node.product;

				// Update title on Shopify
				await graphqlClient.query({
					data: `
						mutation sampleUpdate {
							productUpdate(
								input: {id: "${product.id}", title: "${fields.title}"}
							) {
								product {
									id
									title
								}
							}
						}
					`,
				});

				// Update GID on database
				await prisma.sample.update({
					where: { id: sample.id },
					data: {
						gid: existingSamples[0].node.product.id,
					},
				});

				return json({
					message: 'Sample synced with Shopify.',
				});
			}

			if (productExists && existingSamples.length > 1) {
				return badRequest({
					errors: [
						`${existingSamples.length} instances of this product already exist.`,
					],
				});
			}
		default:
			return badRequest({ message: 'Invalid action' });
	}

	// for (const value of values) {
	// 	vendorProductIds.push({ id: value });
	// }

	// if (vendorProductIds.length !== 0) {
	// 	await prisma.sample.update({
	// 		where: { id: params.sampleId },
	// 		data: {
	// 			vendorProducts: {
	// 				connect: vendorProductIds,
	// 			},
	// 		},
	// 	});
	// }

	// return json({});
};

export default function SampleDetailPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	return (
		<div className="foobar">
			<div className="foobar-main-content">
				<h1>Sample Swatch</h1>

				<div style={{ marginTop: 24, marginBottom: 24 }}>
					<p className="title">
						<Link to="edit">
							{data.sample.seriesName} {data.sample.color}{' '}
							{data.sample.finish}
						</Link>
					</p>
					<p className="caption">{data.sample.materialNo}</p>

					<div>
						<p>Series Alias: {data.sample.seriesAlias}</p>
						<p>Color Alias: {data.sample.colorAlias}</p>
						<p>Shopify ID: {data.sample.gid}</p>

						<Link to="edit" className="button">
							Edit
						</Link>
					</div>
				</div>

				<div style={{ marginTop: 24, marginBottom: 24 }}>
					<h2 className="headline-h5"></h2>
					<Form method="post" className="inline-form" replace>
						<Input
							id="title"
							name="title"
							label="Suggested title"
							defaultValue={`${data.sample.seriesAlias} ${data.sample.finish} ${data.sample.colorAlias} 4x4 Tile Sample`}
						/>
						<button
							className="button"
							type="submit"
							name="_action"
							value="sync"
						>
							Sync with Shopify
						</button>
					</Form>

					{actionData && !actionData.errors ? (
						<div className="success message">
							{actionData.message}
						</div>
					) : null}

					{actionData?.errors &&
						actionData.errors.map((error) => (
							<div key={error} className="error message">
								{error}
							</div>
						))}
				</div>

				{data.connected && data.connected.length !== 0 ? (
					<div style={{ marginTop: 24, marginBottom: 24 }}>
						<h2>Connected Sample Swatches</h2>
						<ul className="foobar-card-list">
							{data.connected.map((product) => (
								<li key={product.id}>
									<Link
										className="foobar-card"
										to={`/vendors/${product.vendor.id}/products/${product.id}`}
									>
										<div>
											<p className="text">
												{product.retailerProduct.title}{' '}
											</p>
											<p className="caption-2">
												{product.retailerProduct.sku}
											</p>
										</div>

										<div>
											<p className="text">
												{product.seriesName}{' '}
												{product.description}{' '}
												{product.finish} {product.color}
											</p>
											<p className="caption-2">
												{product.itemNo}
											</p>
										</div>
									</Link>
								</li>
							))}
						</ul>
					</div>
				) : (
					<div className="error message">
						No product connected to sample swatch.
					</div>
				)}

				{data.vendorProducts && data.vendorProducts.length !== 0 ? (
					<Form method="post" replace>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								marginTop: 48,
								marginBottom: 24,
							}}
						>
							<h2>Possible Matching Products</h2>
							<button type="submit" className="primary button">
								Save
							</button>
						</div>
						<table>
							<tbody>
								{data.vendorProducts.map((product) => (
									<tr key={product.id}>
										<td>
											<input
												type="checkbox"
												name={product.id}
												defaultChecked={
													!product.sampleMaterialNo &&
													product.finish ===
														data.sample.finish
												}
											/>
										</td>
										<td>
											{!product.sampleMaterialNo ? (
												<div>
													<span
														className="indicator"
														style={{
															marginRight: '8px',
														}}
													></span>
													EMPTY
												</div>
											) : null}

											{product.sampleMaterialNo !==
												null &&
											product.sampleMaterialNo !==
												data.sample.materialNo ? (
												<div>
													<span
														className="error indicator"
														style={{
															marginRight: '8px',
														}}
													></span>{' '}
													DOES NOT MATCH
												</div>
											) : null}

											{product.sampleMaterialNo !==
												null &&
											product.sampleMaterialNo ===
												data.sample.materialNo ? (
												<div>
													<span
														className="success indicator"
														style={{
															marginRight: '8px',
														}}
													></span>{' '}
													MATCH
												</div>
											) : null}
										</td>
										<td>
											<Link
												to={`/vendors/${product.vendor.id}/products/${product.id}`}
											>
												{product.seriesName}
											</Link>
											<div>
												<span
													className={
														product.color !==
														data.sample.color
															? 'indicator error'
															: 'indicator success'
													}
												></span>{' '}
												{product.color}
											</div>
											<div>
												<span
													className={
														product.finish !==
														data.sample.finish
															? 'indicator error'
															: 'indicator success'
													}
												></span>{' '}
												{product.finish}
											</div>
										</td>
										<td>{product.thickness}</td>
										<td>{product.itemNo}</td>
									</tr>
								))}
							</tbody>
						</table>
					</Form>
				) : (
					<Form method="get" className="inline-form">
						<Input
							label="Search for vendor products"
							name="query"
							id="query"
						/>
						<button type="submit" className="primary button">
							Search
						</button>
					</Form>
				)}
			</div>

			<Outlet />
		</div>
	);
}
