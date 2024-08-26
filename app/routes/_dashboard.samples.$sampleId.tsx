import { json } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';
import { requireSuperAdmin, requireUserId } from '~/session.server';
import { badRequest } from '~/utils/request.server';
import { graphqlClient } from '~/utils/shopify.server';

import { Button } from '~/components/Buttons';
import { Input, Label, Select } from '~/components/Input';

import type { ActionFunction, LoaderFunction } from '@remix-run/node';

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

	let shopifyProduct;
	let inventoryLocation: { name: string; id: string } | null = null;

	if (sample.gid) {
		shopifyProduct = await getProduct(sample.gid);
	}

	if (shopifyProduct) {
		inventoryLocation =
			shopifyProduct.variants?.edges[0]?.node.inventoryItem
				.inventoryLevels.edges[0].node.location;
	}

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

	return json({
		connected,
		shopifyProduct,
		vendorProducts,
		sample,
		locationOptions,
		inventoryLocation,
	});
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

			if (!sample.gid) {
				return json({
					error: {
						message: "This item isn't connected to Shopify yet.",
					},
				});
			}

			const locationId = formData.get('locationId');
			if (typeof locationId !== 'string' || locationId.length === 0) {
				return json({
					error: { message: 'You must select a valid location' },
				});
			}

			try {
				await updateInventoryLocation(sample.materialNo, locationId);
			} catch (e) {
				if (e instanceof Error) {
					return {
						error: {
							location:
								e.message ||
								'Unable to update product inventory location on Shopify',
						},
					};
				} else {
					return {
						error: {
							location:
								'Unable to update product inventory location on Shopify',
						},
					};
				}
			}

			return json({
				success: { location: 'Inventory location updated.' },
			});
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
				// await graphqlClient.query({
				// 	data: `
				// 		mutation sampleUpdate {
				// 			productUpdate(
				// 				input: {id: "${product.id}", title: "${fields.title}"}
				// 			) {
				// 				product {
				// 					id
				// 					title
				// 				}
				// 			}
				// 		}
				// 	`,
				// });

				// Update GID on database
				await prisma.sample.update({
					where: { id: sample.id },
					data: {
						gid: existingSamples[0].node.product.id,
					},
				});

				return json({
					success: { message: 'Sample mapped with Shopify' },
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
				const metafield = await upsertSampleToProductMetafield(
					sku,
					sampleGID
				);
				metafields.push(metafield);
			}

			return json({
				success: {
					metafields: 'Sample added to product sample metafield(s).',
				},
				metafields,
			});
		}
		case 'update sample vendor': {
			const vendorTitle = formData.get('vendorTitle');
			const seriesName = formData.get('seriesName');
			const color = formData.get('color');

			if (typeof vendorTitle !== 'string' || vendorTitle.length === 0) {
				return json({
					error: { vendor: 'The title field must not be blank' },
				});
			}

			if (typeof seriesName !== 'string' || seriesName.length === 0) {
				return json({
					error: { vendor: 'The collection name must not be blank' },
				});
			}

			if (typeof color !== 'string' || color.length === 0) {
				return json({
					error: { vendor: 'The color must not be blank' },
				});
			}

			try {
				await prisma.sample.update({
					where: { id: params.sampleId },
					data: { vendorTitle, seriesName, color },
				});
			} catch (e) {
				if (e instanceof Error) {
					return json({
						error: {
							vendor: e.message || 'Unable to update sample',
						},
					});
				}
				return json({
					error: {
						vendor: 'Unable to update sample',
					},
				});
			}

			return json({ success: { vendor: 'Sample successfully updated' } });
		}
		case 'update sample edwardmartin': {
			const title = formData.get('title');
			const seriesAlias = formData.get('seriesAlias');
			const colorAlias = formData.get('colorAlias');

			if (typeof title !== 'string' || title.length === 0) {
				return json({
					error: { vendor: 'The title field must not be blank' },
				});
			}

			if (typeof seriesAlias !== 'string' || seriesAlias.length === 0) {
				return json({
					error: { vendor: 'The collection name must not be blank' },
				});
			}

			if (typeof colorAlias !== 'string' || colorAlias.length === 0) {
				return json({
					error: { vendor: 'The color must not be blank' },
				});
			}

			try {
				await prisma.sample.update({
					where: { id: params.sampleId },
					data: { title, seriesAlias, colorAlias },
				});
			} catch (e) {
				if (e instanceof Error) {
					return json({
						error: {
							vendor: e.message || 'Unable to update sample',
						},
					});
				}
				return json({
					error: {
						vendor: 'Unable to update sample',
					},
				});
			}

			return json({
				success: { edwardmartin: 'Sample successfully updated' },
			});
		}
		default:
			return badRequest({ message: 'Invalid action' });
	}
};

const errorMessageClasses =
	'mt-3 break-words rounded-md px-3 py-2 text-sm leading-5 dark:bg-red-950/50 dark:text-red-400';

const successMessageClasses =
	'rounded-md px-3 py-2 text-sm leading-5 dark:bg-green-950/50 dark:text-emerald-400';

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
			<header className="mx-auto max-w-7xl">
				<div className="page-header__row">
					<h1 className="headline-h5">Sample Swatch</h1>
				</div>
				<div className="page-header__row">{data.sample.materialNo}</div>
			</header>

			<div className="mx-auto mt-10 max-w-7xl">
				<div className="grid grid-cols-4 grid-rows-1 items-start gap-x-8 gap-y-8">
					<div className="col-span-full rounded-lg p-6 ring-1 dark:ring-white/5">
						<h3 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
							Sync with Shopify
						</h3>

						<p className="mt-1 max-w-lg text-sm font-light leading-6 text-gray-600 dark:text-zinc-400">
							Looks for a product on Shopify matching the sample's
							material number. If the product exists, it will be
							updated. If the product does not exist, a new
							product will be created with the sample's
							information.
						</p>

						{data.sample.gid ? (
							<div className="mt-6 rounded-md bg-zinc-950 px-3 py-2">
								<code className="">{data.sample.gid}</code>
							</div>
						) : null}

						<Form
							method="post"
							className="mt-6 flex items-end gap-x-3"
							replace
						>
							{/* <div>
								<Input
									id="title"
									name="title"
									label={
										data.sample.title
											? 'Title'
											: 'Suggested title'
									}
									defaultValue={
										data.sample.title
											? data.sample.title
											: suggestedTitle
									}
								/>
							</div> */}

							<Button type="submit" name="_action" value="sync">
								Map to Shopify
							</Button>
						</Form>

						{data.locationOptions && (
							<>
								<Form
									method="post"
									className="mt-6 flex items-end gap-x-3"
									replace
								>
									<div>
										<Label htmlFor="locationId">
											Inventory location
										</Label>

										<div className="mt-2">
											<Select
												id="locationId"
												name="locationId"
												options={data.locationOptions}
												defaultValue={
													data.inventoryLocation?.id
												}
												hasBlankOption={true}
											/>
										</div>
									</div>

									<Button
										type="submit"
										name="_action"
										value="location"
									>
										Update Inventory Location
									</Button>

									{actionData?.success?.location ? (
										<div className={successMessageClasses}>
											{actionData.success.location}
										</div>
									) : null}
								</Form>

								{actionData?.error?.location ? (
									<div className={errorMessageClasses}>
										{actionData.error.location}
									</div>
								) : null}
							</>
						)}

						{data.connected && data.connected.length !== 0 ? (
							<div style={{ marginTop: 48, marginBottom: 48 }}>
								<Form method="post">
									<input
										type="hidden"
										name="sampleGID"
										value={data.sample.gid}
									/>
									<div>
										<h3 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
											Products using this swatch
										</h3>

										<p className="mt-1 max-w-lg text-sm font-light leading-6 text-gray-600 dark:text-zinc-400">
											Add this sample swatch to the
											Shopify products' sample metafields.
										</p>

										<ul className="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5 dark:divide-zinc-800 dark:bg-zinc-900 dark:ring-white/5">
											{data.connected.map(
												(vendorProduct) => (
													<li
														key={vendorProduct.id}
														className="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-gray-50 dark:hover:bg-zinc-950 sm:px-6"
													>
														<div className="flex min-w-0 gap-x-4">
															<input
																type="hidden"
																name="connected"
																value={
																	vendorProduct
																		.retailerProduct
																		.sku
																}
															/>

															<div>
																<p className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
																	{
																		vendorProduct
																			.retailerProduct
																			.title
																	}
																</p>

																<p className="mt-1 text-xs leading-5 text-gray-500 dark:text-zinc-400">
																	{
																		vendorProduct
																			.retailerProduct
																			.sku
																	}
																</p>
															</div>
														</div>
													</li>
												)
											)}
										</ul>

										<div className="mt-6">
											<Button
												color="primary"
												name="_action"
												value="metafield"
											>
												Add
											</Button>
										</div>
									</div>

									{actionData?.success?.connect ? (
										<div className={successMessageClasses}>
											{actionData.success.connect}
										</div>
									) : null}

									{actionData?.success?.metafields ? (
										<div className={successMessageClasses}>
											{actionData.success.metafields}
										</div>
									) : null}
								</Form>
							</div>
						) : null}

						{actionData?.success?.message ? (
							<div
								className={successMessageClasses}
								style={{ marginTop: 12 }}
							>
								{actionData.success.message}
							</div>
						) : null}

						{actionData?.error?.message ? (
							<div className={errorMessageClasses}>
								{actionData.error.message}
							</div>
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

					<div className="col-span-2 rounded-lg p-6 ring-1 dark:ring-white/5">
						<div>
							<div>
								<h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
									{data.sample.vendor.name}
								</h3>

								<Form
									method="post"
									className="mt-6 flex flex-col gap-y-3"
								>
									<div>
										<Input
											id="vendorTitle"
											name="vendorTitle"
											label="Title"
											defaultValue={
												data.sample.vendorTitle
											}
										/>
									</div>

									<div>
										<Input
											id="seriesName"
											name="seriesName"
											label={`${data.sample.vendor.name}'s collection name`}
											defaultValue={
												data.sample.seriesName
											}
										/>
									</div>

									<div>
										<Input
											id="color"
											name="color"
											label={`${data.sample.vendor.name}'s color`}
											defaultValue={data.sample.color}
										/>
									</div>

									<Button
										color="primary"
										type="submit"
										name="_action"
										value="update sample vendor"
									>
										Save
									</Button>

									<Button type="reset">Reset</Button>

									{actionData?.success &&
									actionData.success.vendor ? (
										<div className="rounded-md px-3 py-2 text-sm leading-5 dark:bg-green-950/50 dark:text-emerald-400">
											{actionData.success.vendor}
										</div>
									) : null}

									{actionData?.error &&
									actionData.error.vendor ? (
										<div className="break-words rounded-md px-3 py-2 text-sm leading-5 dark:bg-red-950/50 dark:text-red-400">
											{actionData.error.vendor}
										</div>
									) : null}
								</Form>
							</div>
						</div>
					</div>

					<div className="col-span-2 rounded-lg p-6 ring-1 dark:ring-white/5">
						<h3 className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
							Edward Martin
						</h3>

						<Form
							method="post"
							className="mt-6 flex flex-col gap-y-3"
						>
							<div>
								<Input
									id="title"
									name="title"
									label="Title"
									defaultValue={data.sample.title}
								/>
							</div>

							<div>
								<Input
									id="seriesAlias"
									name="seriesAlias"
									label="Collection name"
									defaultValue={data.sample.seriesAlias}
								/>
							</div>

							<div>
								<Input
									id="colorAlias"
									name="colorAlias"
									label="Color"
									defaultValue={data.sample.colorAlias}
								/>
							</div>

							<div>
								<Input
									id="finish"
									name="finish"
									label="Finish"
									defaultValue={data.sample.finish}
								/>
							</div>

							<Button
								color="primary"
								type="submit"
								name="_action"
								value="update sample edwardmartin"
							>
								Save
							</Button>

							<Button type="reset">Reset</Button>

							{actionData?.success &&
							actionData.success.edwardmartin ? (
								<div className="rounded-md px-3 py-2 text-sm leading-5 dark:bg-green-950/50 dark:text-emerald-400">
									{actionData.success.edwardmartin}
								</div>
							) : null}
						</Form>
					</div>

					<pre className="col-span-full rounded-lg bg-zinc-950 p-6 text-xs text-cyan-300">
						{JSON.stringify(data.sample, null, 4)}
					</pre>
				</div>
			</div>
		</>
	);
}

// FUNCTIONS
// Functions should filter response.body.data

async function getProduct(gid: string): Promise<any | null> {
	const queryString = `
	{
		product(id: "${gid}") {
		  id
		  title
		  variants(first: 2) {
			edges {
			  node {
				id
				title
				inventoryItem {
				  id
				  inventoryLevels(first: 4) {
					edges {
					  node {
						location {
						  id
						  name
						  isActive
						}
					  }
					}
				  }
				}
			  }
			}
		  }
		}
	  }`;

	const shopifyResponse = await graphqlClient.query({ data: queryString });
	const product = shopifyResponse?.body?.data?.product;

	if (!product) return null;
	return product;
}

async function getProductFromSKU(sku: string) {
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
				inventoryItem {
          id
          inventoryLevels(first: 4) {
            edges {
              node {
                location {
                  id
                  name
                  isActive
                }
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

	const productVariant =
		shopifyResponse?.body?.data?.productVariants?.edges[0]?.node;

	const locations = productVariant.inventoryItem.inventoryLevels.edges;

	locations.forEach((location) => {
		console.log('LOCATION', location.node);
	});

	console.log('RESPONSE', locations);

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

async function fetchInventoryItemId(sku: string) {
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

async function updateInventoryLocation(sku: string, locationId: string) {
	const inventoryItemId = await fetchInventoryItemId(sku);
	if (!inventoryItemId) {
		throw new Error(`Unable to get inventory item id from item no. ${sku}`);
	}

	const inventoryLocations = await fetchInventoryLocations();
	if (!inventoryLocations) {
		throw new Error('Unable to fetch inventory locations');
	}

	const inventoryItemUpdates = inventoryLocations
		.map(
			(location) =>
				`{ activate: ${location.id === locationId}, locationId: "${
					location.id
				}" }`
		)
		.join(', ');

	let query = `mutation inventoryBulkToggleActivation {
		inventoryBulkToggleActivation(
		  	inventoryItemId: "${inventoryItemId}",
		  	inventoryItemUpdates: [${inventoryItemUpdates}],
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

	let response;
	try {
		response = await graphqlClient.query({ data: query });
		const updatedInventoryItem =
			response?.body?.data?.inventoryBulkToggleActivation?.inventoryItem;
		if (!updatedInventoryItem) {
			throw new Error('Unable to update location');
		}
	} catch (e) {
		console.log('ERROR', e);
		throw new Error('Unable to update location');
	}
}

// TODO: Refactor function names

async function createShopifyProductFromSample(
	title: string,
	materialNo: string
) {
	const product = await createShopifyProduct(title);
	const res = await updateShopifyProductVariant({
		id: product.variants.edges[0].node.id,
		sku: materialNo,
	});

	return res.product;
}

async function createShopifyProduct(title: string) {
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

async function updateShopifyProductVariant({
	id,
	sku,
	price = 1.0,
}: {
	id: string;
	sku: string;
	price?: number;
}) {
	const response = await graphqlClient.query({
		data: `
			mutation productVariantUpdate {
				productVariantUpdate(input: {
					id: "${id}",
					sku: "${sku}",
					price: ${price},
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
					}
					productVariant {
						id
						price
						sku
					}
					userErrors {
						field
						message
					}
				}
			}
		`,
	});

	console.log('RESPONSE', response?.body?.data?.productVariantUpdate);

	return response?.body?.data?.productVariantUpdate;
}
