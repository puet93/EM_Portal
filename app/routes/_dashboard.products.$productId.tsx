import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Outlet, useActionData, useLoaderData } from '@remix-run/react';
import { useRef, useState } from 'react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { badRequest } from '~/utils/request.server';
import { graphqlClient } from '~/utils/shopify.server';
import { ClipboardCheckmarkIcon, ClipboardPinIcon } from '~/components/Icons';
import Input from '~/components/Input';

export const loader: LoaderFunction = async ({ params, request }) => {
	await requireUserId(request);

	const product = await prisma.retailerProduct.findUnique({
		where: { id: params.productId },
		select: {
			id: true,
			sku: true,
			title: true,
			vendorProduct: true,
		},
	});

	if (!product) {
		return badRequest({ message: 'Unable to find product.' });
	}

	console.log('PRODUCT', product);

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
	const title = formData.get('title');

	if (typeof title !== 'string') {
		throw new Error('Invalid title input');
	}

	const product = await prisma.retailerProduct.update({
		where: {
			id: params.productId,
		},
		data: {
			title: title,
		},
	});

	return json({ product });
};

export default function ProductDetailPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const ref = useRef(null);
	const [isCopied, setIsCopied] = useState(false);

	function copyToClipboard(inputEl: HTMLInputElement) {
		navigator.clipboard.writeText(inputEl.value);
	}

	function handleClick(inputEl: HTMLInputElement) {
		copyToClipboard(inputEl);
		setIsCopied(true);
		setTimeout(() => {
			setIsCopied(false);
		}, 1000);
	}

	return (
		<div className="wrapper">
			<header>
				<h1 className="headline-h3">Product Details</h1>
				<div className="text">{data.product.title}</div>
			</header>

			<div className="foobar">
				<section className="foobar-main-content">
					<Form method="post">
						<Input
							label="Title"
							id="title"
							name="title"
							defaultValue={data.product.title}
						/>
						<button type="submit" className="primary button">
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
									ref={ref}
								/>
								<button
									className={
										isCopied
											? 'codeblock__button codeblock__button--copied'
											: 'codeblock__button'
									}
									type="button"
									onClick={() => handleClick(ref.current)}
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
		</div>
	);
}
