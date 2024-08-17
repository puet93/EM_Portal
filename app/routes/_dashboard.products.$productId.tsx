import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Outlet, useActionData, useLoaderData } from '@remix-run/react';
import type { RefObject } from 'react';
import { useRef, useState } from 'react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { badRequest } from '~/utils/request.server';
import { graphqlClient } from '~/utils/shopify.server';
import { ClipboardCheckmarkIcon, ClipboardPinIcon } from '~/components/Icons';
import { Input } from '~/components/Input';

export const loader: LoaderFunction = async ({ params, request }) => {
	await requireUserId(request);

	const product = await prisma.retailerProduct.findUnique({
		where: { id: params.productId },
		select: {
			id: true,
			sku: true,
			title: true,
			vendorProduct: true,
			tile: true,
		},
	});

	if (!product) {
		return badRequest({ message: 'Unable to find product.' });
	}

	const query = `{
		productVariants(first: 2, query: "sku:${product.sku}") {
			edges {
				node {
					product {
						id
						title
						legacyResourceId
					}
				}
			}
		}
	}`;

	// TODO: Add warning for duplicate SKUs
	const res = await graphqlClient.query({ data: query }).then((res) => {
		const edges = res.body?.data.productVariants.edges;
		if (edges.length === 0) return null;
		return edges[0].node;
	});

	return json({ product, shopifyProduct: res?.product });
};

export const action: ActionFunction = async ({ params, request }) => {
	await requireUserId(request);
	const formData = await request.formData();
	const _action = formData.get('_action');

	let product;
	switch (_action) {
		case 'connect': {
			const itemNo = formData.get('itemNo');

			if (typeof itemNo !== 'string') {
				throw new Error('Invalid item number input');
			}

			product = await prisma.retailerProduct.update({
				where: {
					id: params.productId,
				},
				data: {
					vendorProduct: {
						connect: {
							itemNo: itemNo,
						},
					},
				},
				include: {
					vendorProduct: true,
				},
			});
			break;
		}
		case 'update': {
			// const { sku, title, width, length, thickness, ...values } =
			// 	Object.fromEntries(formData);

			const { sku, title } = Object.fromEntries(formData);

			if (typeof title !== 'string' || typeof sku !== 'string') {
				throw new Error('Invalid title input');
			}

			product = await prisma.retailerProduct.update({
				where: {
					id: params.productId,
				},
				data: {
					title: title,
					sku: sku,
					// tile: {
					// 	upsert: {
					// 		create: {
					// 			width: Number(width),
					// 			length: Number(length),
					// 			thickness: Number(thickness),
					// 			...values,
					// 		},
					// 		update: {
					// 			width: Number(width),
					// 			length: Number(length),
					// 			thickness: Number(thickness),
					// 			...values,
					// 		},
					// 	},
					// },
				},
				include: {
					tile: true,
				},
			});
			break;
		}
		default:
			throw new Error('Invalid action input');
	}
	return json({ product });
};

export default function ProductDetailPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const inputElRef = useRef(null) as RefObject<HTMLInputElement>;
	const [isCopied, setIsCopied] = useState(false);

	function copyToClipboard(inputEl: HTMLInputElement) {
		navigator.clipboard.writeText(inputEl.value);
	}

	function handleClick(inputElRef: RefObject<HTMLInputElement>) {
		if (!inputElRef.current) return;
		copyToClipboard(inputElRef.current);
		setIsCopied(true);
		setTimeout(() => {
			setIsCopied(false);
		}, 1000);
	}

	return (
		<>
			<header>
				<h1 className="headline-h3">Product Details</h1>
				<div className="text">{data.product.title}</div>
				<div className="text">
					{data.product.sku} | {data.product.vendorProduct?.itemNo}
				</div>
			</header>

			<div className="foobar">
				<section className="foobar-main-content">
					<Form method="post">
						<Input
							label="Item No."
							id="item-number"
							name="itemNo"
							defaultValue={data.product.vendorProduct?.itemNo}
						/>

						<button
							className="primary button"
							name="_action"
							value="connect"
						>
							Connect
						</button>
					</Form>

					<Form method="post">
						<Input
							label="SKU"
							id="sku"
							name="sku"
							defaultValue={data.product.sku}
						/>

						<Input
							label="Title"
							id="title"
							name="title"
							defaultValue={data.product.title}
						/>

						{/* <Input
							label="Color"
							id="color"
							name="color"
							defaultValue={data.product.tile?.color}
						/>

						<Input
							label="Finish"
							id="finish"
							name="finish"
							defaultValue={data.product.tile?.finish}
						/>

						<Input
							label="Material"
							id="material"
							name="material"
							defaultValue={
								data.product.tile
									? data.product.tile.material
									: 'PORCELAIN'
							}
						/>

						<Input
							label="Width"
							id="width"
							name="width"
							defaultValue={data.product.tile?.width}
						/>

						<Input
							label="Width Unit"
							id="width-unit"
							name="widthUnit"
							defaultValue={
								data.product.tile
									? data.product.tile.widthUnit
									: 'INCHES'
							}
						/>

						<Input
							label="Length"
							id="length"
							name="length"
							defaultValue={data.product.tile?.length}
						/>

						<Input
							label="Length Unit"
							id="length-unit"
							name="lengthUnit"
							defaultValue={
								data.product.tile
									? data.product.tile.lengthUnit
									: 'INCHES'
							}
						/>

						<Input
							label="Thickness"
							id="thickness"
							name="thickness"
							defaultValue={data.product.tile?.thickness}
						/>

						<Input
							label="Thickness Unit"
							id="thickness-unit"
							name="thicknessUnit"
							defaultValue={
								data.product.tile
									? data.product.tile.thicknessUnit
									: 'MILLIMETERS'
							}
						/> */}

						<button
							type="submit"
							className="primary button"
							name="_action"
							value="update"
						>
							Update
						</button>
					</Form>

					{actionData?.product ? (
						<div className="success message">Product updated.</div>
					) : null}

					{data.shopifyProduct ? (
						<div>
							<h2>Shopify</h2>
							<p>Below is the product's ID on Shopify.</p>
							<div className="codeblock">
								<pre>
									<code>
										{data.shopifyProduct?.legacyResourceId}
									</code>
								</pre>
								<input
									type="hidden"
									value={
										data.shopifyProduct?.legacyResourceId
									}
									ref={inputElRef}
								/>
								<button
									className={
										isCopied
											? 'codeblock__button codeblock__button--copied'
											: 'codeblock__button'
									}
									type="button"
									onClick={() => handleClick(inputElRef)}
								>
									{isCopied ? (
										<>
											<ClipboardCheckmarkIcon />
											<span className="sr-only">
												Copied
											</span>
										</>
									) : (
										<>
											<ClipboardPinIcon />
											<span className="sr-only">
												Copy
											</span>
										</>
									)}
								</button>
							</div>
						</div>
					) : (
						<div className="error message">
							Product not found on Shopify
						</div>
					)}
				</section>

				<Outlet />
			</div>
		</>
	);
}
