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
import { requireSuperAdmin, requireUserId } from '~/session.server';
import { badRequest } from '~/utils/request.server';
import Dropdown from '~/components/Dropdown';
import Input from '~/components/Input';
import { graphqlClient } from '~/utils/shopify.server';

export const loader: LoaderFunction = async ({ params, request }) => {
	await requireSuperAdmin(request);

	const searchParams = new URL(request.url).searchParams;
	const entries = Object.fromEntries(searchParams);
	const query = entries.query;

	const sample = await prisma.sample.findUnique({
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
	const locationOptions = inventoryLocations.map((location) => ({
		label: location.name,
		value: location.id,
	}));

	return json({ connected, vendorProducts, sample, locationOptions });
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
					error: { message: 'Unable to locate sample in database.' },
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
					error: {
						message: 'Unable to query Shopify for sample product.',
					},
				});
			}

			const responseBody = shopifyResponse.body;
			if (!responseBody) {
				return badRequest({
					error: {
						message: 'Unable to get product on Shopify',
					},
				});
			}

			const existingSamples = responseBody?.data?.productVariants?.edges;
			const productExists = existingSamples.length !== 0;

			// If sample does not exist on Shopify as a product
			if (!productExists) {
				// Create Shopify product from sample

				let newShopifyProduct;
				try {
					newShopifyProduct = await createShopifyProductFromSample(
						String(fields.title),
						sample.materialNo
					);
				} catch (e) {
					return badRequest({
						error: {
							message:
								'Unable to create product on Shopify from sample',
							response: e,
						},
					});
				}

				// Update sample on database with Shopify product's GID
				await prisma.sample.update({
					where: { id: sample.id },
					data: {
						gid: newShopifyProduct.id,
					},
				});

				return json({
					success: {
						message: 'Sample created on Shopify.',
						responseBody: newShopifyProduct,
					},
				});
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
			return json({
				success: {
					connect:
						'Sample(s) added to related product Sample metafield',
				},
			});
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
		<>
			<header className="page-header">
				<div className="page-header__row">
					<h1 className="headline-h5">Sample Swatch</h1>

					<div className="page-header__actions">
						<Link to="edit" className="button">
							Edit
						</Link>
					</div>
				</div>
				<div className="page-header__row">{data.sample.materialNo}</div>
			</header>

			<div className="foobar">
				<div className="foobar-main-content">
					<div
						style={{
							display: 'flex',
							marginBottom: 32,
						}}
					>
						<div style={{ marginRight: 32 }}>
							<p
								className="caption"
								style={{ marginTop: 0, marginBottom: 8 }}
							>
								{data.sample.vendor.name}
							</p>
							<p className="title" style={{ marginTop: 0 }}>
								{data.sample.seriesName} in {data.sample.finish}{' '}
								{data.sample.color}
							</p>
						</div>

						<div>
							<p
								className="caption"
								style={{ marginTop: 0, marginBottom: 8 }}
							>
								Edward Martin
							</p>
							<p className="title" style={{ marginTop: 0 }}>
								{data.sample.seriesAlias} in{' '}
								{data.sample.finish} {data.sample.colorAlias}
							</p>
						</div>
					</div>

					<div style={{ marginTop: 24, marginBottom: 24 }}>
						<h2 className="headline-h5">Sync with Shopify</h2>
						<p style={{ maxWidth: 768 }}>
							Looks for a product on Shopify matching the sample's
							material number. If the product exists, it will be
							updated. If the product does not exist, a new
							product will be created with the sample's
							information.
						</p>

						{data.sample.gid ? (
							<code>{data.sample.gid}</code>
						) : null}

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

						{actionData?.success?.message ? (
							<div
								className="success message"
								style={{ marginTop: 12 }}
							>
								{actionData.success.message}
							</div>
						) : null}

						{actionData?.error?.message ? (
							<div
								className="error message"
								style={{ marginTop: 12 }}
							>
								{actionData.error.message}
							</div>
						) : null}

						{actionData?.error?.response ? (
							<code style={{ marginTop: 12 }}>
								{JSON.stringify(
									actionData.error.response,
									null,
									4
								)}
							</code>
						) : null}

						{actionData?.success?.responseBody ? (
							<code>
								{JSON.stringify(
									actionData.success.responseBody,
									null,
									4
								)}
							</code>
						) : null}
					</div>

					{data.locationOptions && (
						<div style={{ marginTop: 24, marginBottom: 24 }}>
							<h2 className="headline-h5"></h2>
							<Form method="post" className="inline-form" replace>
								<Dropdown
									name="locationId"
									options={data.locationOptions}
								/>

								<button
									className="button"
									type="submit"
									name="_action"
									value="location"
								>
									Update Inventory Location
								</button>
							</Form>

							{actionData?.success?.updateInventoryLocation ? (
								<div className="success message">
									{actionData.success.updateInventoryLocation}
								</div>
							) : null}
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
									<h2 className="headline-h5">
										Products using this swatch
									</h2>

									<button
										className="primary button"
										name="_action"
										value="metafield"
									>
										Metafield
									</button>
								</div>

								{actionData?.success?.connect ? (
									<div className="success message">
										{actionData.success.connect}
									</div>
								) : null}

								<ul className="foobar-card-list">
									{data.connected.map((product) => (
										<li key={product.id}>
											<div>
												<input
													type="hidden"
													name="connected"
													value={
														product.retailerProduct
															.sku
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
					) : null}
				</div>

				<div className="foobar-sidebar">
					<Outlet />
				</div>
			</div>
		</>
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
	const queryString = `{
		locations(first: 20) {
			edges {
				node {
					id
					name
				}
			}
		}
	}`;

	const shopifyResponse = await graphqlClient.query({ data: queryString });
	const locations = shopifyResponse.body?.data?.locations.edges.map(
		(edge) => edge.node
	);

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

	return response?.body?.data?.productCreate.product;
}

async function createShopifyProductVariantFromSample(
	sku: string,
	productId: string
) {
	const response = await graphqlClient.query({
		data: `
			mutation productVariantCreate {
				productVariantCreate(input: {
					sku: "${sku}",
					price: 1.00,
					productId: "${productId}",
					inventoryItem: {
						measurement: {
							weight: {
								value: 0.5,
								unit: POUNDS,
							}
						}
					}
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

	return response?.body?.data?.productCreate.product;
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
