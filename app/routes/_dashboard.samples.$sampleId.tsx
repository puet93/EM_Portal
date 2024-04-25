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
		include: {
			vendor: true,
			vendorProducts: {
				include: {
					retailerProduct: true,
				},
			},
		},
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

	const inventoryLocations = await fetchInventoryLocations();

	return json({ connected, vendorProducts, sample, inventoryLocations });
};

export const action: ActionFunction = async ({ params, request }) => {
	await requireUserId(request);
	const formData = await request.formData();
	const { _action, ...fields } = Object.fromEntries(formData);

	switch (_action) {
		case 'location': {
			const sample = await prisma.sample.findUnique({
				where: { id: params.sampleId },
			});

			if (!sample) {
				return badRequest({
					errors: ['Unable to locate sample in database.'],
				});
			}

			await updateInventoryLocation(sample.materialNo, fields.locationId);

			return json({ message: 'Inventory location updated.' });
		}
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

			// If sample does not exist on Shopify as a product
			if (!productExists) {
				// Create Shopify product from sample
				const newShopifyProduct = await createShopifyProductFromSample(
					String(fields.title),
					sample.materialNo
				);

				// Update sample on database with Shopify product's GID
				await prisma.sample.update({
					where: { id: sample.id },
					data: {
						gid: newShopifyProduct.id,
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
		case 'connect': {
			const values = formData.getAll('productId');
			const vendorProductIds = [];
			for (const value of values) {
				vendorProductIds.push({ id: value });
			}

			if (vendorProductIds.length !== 0) {
				await prisma.sample.update({
					where: { id: params.sampleId },
					data: {
						vendorProducts: {
							connect: vendorProductIds,
						},
					},
				});
			}
			return json({ message: 'Connected' });
		}
		case 'metafield': {
			const skus = formData.getAll('connected');
			const sampleGID = formData.get('sampleGID');

			const metafields = [];
			for (const sku of skus) {
				console.log(`METAFIELD: ${sku}`);

				const metafield = await upsertSampleToProductMetafield(
					sku,
					sampleGID
				);
				metafields.push(metafield);
			}

			return json({ metafields });
		}
		default:
			console.log('INVALID ACTION');
			return badRequest({ message: 'Invalid action' });
	}
};

export default function SampleDetailPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const { seriesAlias, colorAlias, finish } = data.sample;

	let suggestedTitle = '';

	try {
		if (data.connected.length > 1) {
			if (seriesAlias && colorAlias) {
				suggestedTitle = seriesAlias;
			}
			if (suggestedTitle && finish) {
				suggestedTitle = suggestedTitle + ' ' + finish;
			}
			if (suggestedTitle) {
				suggestedTitle =
					suggestedTitle + ' ' + colorAlias + ' Tile Sample';
			}
		}

		if (data.connected.length == 1) {
			const title = data.connected[0].retailerProduct.title;
			suggestedTitle = title + ' Sample';
		}
	} catch (e) {
		console.log(e);
	}

	return (
		<div className="foobar">
			<div className="foobar-main-content">
				<h1>Sample Swatch</h1>
				{data.sample.vendor ? <p>{data.sample.vendor.name}</p> : null}

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
					<h2 className="headline-h5">Sync with Shopify</h2>
					<p style={{ maxWidth: 768 }}>
						Looks for a product on Shopify matching the sample's
						material number. If the product exists, it will be
						updated. If the product does not exist, a new product
						will be created with the sample's information.
					</p>
					<Form method="post" className="inline-form" replace>
						<Input
							id="title"
							name="title"
							label="Suggested title"
							defaultValue={suggestedTitle}
						/>
						<button
							className="button"
							type="submit"
							name="_action"
							value="sync"
						>
							Sync
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

				{data.inventoryLocations && (
					<div style={{ marginTop: 24, marginBottom: 24 }}>
						<h2 className="headline-h5"></h2>
						<Form method="post" className="inline-form" replace>
							<select name="locationId">
								{data.inventoryLocations.map((location) => (
									<option
										key={location.node.id}
										value={location.node.id}
									>
										{location.node.name}
									</option>
								))}
							</select>

							<button
								className="button"
								type="submit"
								name="_action"
								value="location"
							>
								Update Inventory Location
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
				)}

				{data.connected && data.connected.length !== 0 ? (
					<div style={{ marginTop: 48, marginBottom: 48 }}>
						<Form method="post">
							<input
								type="hidden"
								name="sampleGID"
								value={data.sample.gid}
							/>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
								}}
							>
								<h2 className="headline-h5">HERRO?S!</h2>

								<button
									className="primary button"
									name="_action"
									value="metafield"
								>
									Metafield
								</button>
							</div>

							{actionData?.metafields &&
								actionData.metafields.map((metafield) => (
									<div
										className="success message"
										key={metafield.id}
									>
										{metafield.id}
									</div>
								))}

							<ul className="foobar-card-list">
								{data.connected.map((product) => (
									<li key={product.id}>
										<div>
											<input
												type="hidden"
												name="connected"
												value={
													product.retailerProduct.sku
												}
											/>
											<code>
												{JSON.stringify(
													product,
													null,
													4
												)}
											</code>
										</div>
									</li>
								))}
							</ul>
						</Form>
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
							<button
								type="submit"
								className="primary button"
								name="_action"
								value="connect"
							>
								Connect
							</button>
						</div>
						<table>
							<thead>
								<tr>
									<th>
										<input
											type="checkbox"
											defaultChecked={false}
										/>
									</th>
									<th></th>
									<th></th>
									<th></th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{data.vendorProducts.map((product) => (
									<tr key={product.id}>
										<td>
											<input
												type="checkbox"
												name="productId"
												value={product.id}
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

// FUNCTIONS
// Functions should filter response.body.data

async function getProductFromSKU(sku: String) {
	const queryString = `{
		productVariants(first: 1, query: "sku:${sku}") {
			edges {
				node {
					product {
						id
						title
						metafields(first: 1, keys: ["pdp.sample"]) {
							edges {
								node {
									id
									type
									namespace
									key
									value
								}
							}
						}
					}
				}
			}
		}
	}`;

	const shopifyResponse = await graphqlClient.query({ data: queryString });
	const product =
		shopifyResponse?.body?.data?.productVariants?.edges[0]?.node?.product;

	if (!product) {
		return null;
	}

	return product;
}

async function upsertSampleToProductMetafield(sku, sampleGID) {
	// TODO: Remove this
	console.log(`upsertSampleToProductMetafield(${sku}, ${sampleGID})`);

	// Get the Product GID
	const product = await getProductFromSKU(sku);

	if (!product) {
		console.log('NO PRODUCT');
		return badRequest({});
	}

	// If product already has sample
	let metafield;
	if (product.metafields.edges.length !== 0) {
		metafield = product.metafields.edges[0].node;
		return metafield;
	}

	// Update product metafield with Sample's Shopify GID
	const response = await graphqlClient.query({
		data: `
			mutation productMetafieldSampleCreate {
				productUpdate(
					input: {id: "${product.id}", metafields: [{key: "sample", namespace: "pdp", type: "product_reference", value: "${sampleGID}"}]}
				) {
					product {
						id
						title
						metafield(namespace: "pdp", key: "sample") {
							id
							key
							namespace
							type
							value
						}
					}
				}
			}
		`,
	});

	return response.body.data;
}

async function fetchInventoryLocations() {
	const locations = [
		{
			node: {
				id: 'gid://shopify/Location/72879243482',
				name: 'Decor Tile FOB Texas',
			},
		},
		{
			node: {
				id: 'gid://shopify/Location/75041603802',
				name: 'European Porcelain Ceramics',
			},
		},
		{
			node: {
				id: 'gid://shopify/Location/71944863962',
				name: 'Florim',
			},
		},
		{
			node: {
				id: 'gid://shopify/Location/74360193242',
				name: 'Roca - Anaheim',
			},
		},
	];

	return locations;
}

async function fetchInventoryItemId(sku: String) {
	const queryString = `query {
		inventoryItems(first: 1, query: "sku:${sku}") {
		  	edges {
				node {
			  		id
			  		tracked
			  		sku
				}
		  	}
		}
	}`;

	const shopifyResponse = await graphqlClient.query({ data: queryString });
	const inventoryItem =
		shopifyResponse?.body?.data?.inventoryItems?.edges[0]?.node;

	if (!inventoryItem) {
		return null;
	}

	return inventoryItem.id;
}

async function updateInventoryLocation(sku, locationId) {
	let inventoryItemId = await fetchInventoryItemId(sku);

	let query = `mutation inventoryBulkToggleActivation {
		inventoryBulkToggleActivation(
		  	inventoryItemId: "${inventoryItemId}",
		  	inventoryItemUpdates: [
				{
					activate: ${locationId === 'gid://shopify/Location/72879243482' ? true : false},
					locationId: "gid://shopify/Location/72879243482",
				},
				{
					activate: ${locationId === 'gid://shopify/Location/75041603802' ? true : false},
					locationId: "gid://shopify/Location/75041603802",
				},
				{
					activate: ${locationId === 'gid://shopify/Location/71944863962' ? true : false},
					locationId: "gid://shopify/Location/71944863962",
				},
				{
					activate: ${locationId === 'gid://shopify/Location/74360193242' ? true : false},
					locationId: "gid://shopify/Location/74360193242",
				}
			]
		) {
		  	inventoryItem {
				id
				variant {
					product {
						title
					}
				}
		  	}
		  	inventoryLevels {
				id
				location {
					id
					name
					isActive
				}
		  	}
		}
	}`;

	let response = await graphqlClient.query({ data: query });
	return response.body.data;
}

async function createShopifyProductFromSample(
	title: String,
	materialNo: String
) {
	const response = await graphqlClient.query({
		data: `
			mutation productCreate {
				productCreate(input: {
					title: "${title}",
					status: DRAFT,
					tags: ["sample"],
					templateSuffix: "sample",
					variants: [{ 
						sku: "${materialNo}", 
						price: "1.00", 
						weight: 0.5,
						weightUnit: POUNDS,
					}]
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

	return response.body.data.productCreate.product;
}

async function syncWithShopify(sku: String) {
	// Create or update sample on Shopify

	// Then update inventory location
	let updatedInventoryLocation = await updateInventoryLocation(
		sku,
		'locationId'
	);

	// Then add sample to the metafields of related products
}
