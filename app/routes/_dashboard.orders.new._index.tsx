import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import {
	Form,
	Link,
	useActionData,
	useFetcher,
	useLoaderData,
	useSubmit,
} from '@remix-run/react';
import { fetchOrderByName } from '~/utils/shopify.server';
import { prisma } from '~/db.server';
import { useRef, useState } from 'react';
import { SearchIcon, TrashIcon } from '~/components/Icons';
import Counter from '~/components/Counter';
import { badRequest } from '~/utils/request.server';

export const loader: LoaderFunction = async ({ request }) => {
	const searchParams = new URL(request.url).searchParams;
	const query = searchParams.get('query');

	// Shopify sample order search
	let errors: { order?: string; searchHint?: string } = {};
	let order;
	let searchHint;
	if (query) {
		order = await fetchOrderByName(query);

		if (order?.lineItems) {
			let skus = order.lineItems.map((item) => item.sku);
			searchHint = skus.join(', ');
		}
	}

	if (Object.keys(errors).length !== 0) return json({ errors });
	return json({ order, searchHint });
};

export const action: ActionFunction = async ({ request }) => {
	const formData = await request.formData();
	const cart = formData.get('cart');
	const address = formData.get('address');
	const orderName = formData.get('orderName');

	if (typeof cart !== 'string' || cart.length === 0) {
		return json({ error: 'Unable to get cart.' });
	}

	if (typeof address !== 'string' || address.length === 0) {
		return json({ error: 'Unable to get address.' });
	}

	if (typeof orderName !== 'string' || orderName.length === 0) {
		return json({ error: 'Unable to get order name.' });
	}

	const parsedCart: { id: string; quantity: string }[] = JSON.parse(cart);
	const parsedAddress = JSON.parse(address);
	const fulfillments: string[] = [];

	parsedCart.filter((item) => {
		if (!item.vendorId) return; // Seems like a good place to check for no vendors

		if (!fulfillments.includes(item.vendorId)) {
			fulfillments.push(item.vendorId);
		}
	});

	try {
		const response = await prisma.$transaction(async (tx) => {
			// Create the order, order line items, and fulfillments
			const order = await prisma.order.create({
				data: {
					name: orderName,
					lineItems: {
						create: parsedCart.map((item) => ({
							sampleId: item.id,
							quantity: Number(item.quantity),
						})),
					},
					fulfillments: {
						create: fulfillments.map((vendorId, index) => ({
							name: `${orderName}-F${index + 1}`,
							vendorId: vendorId,
						})),
					},
					address: {
						create: parsedAddress,
					},
				},
				include: {
					lineItems: {
						include: {
							sample: true,
						},
					},
					fulfillments: true,
				},
			});

			// Add the order line-items as fulfillment line-items to the correct fulfillments
			order.lineItems.map(async (orderLineItem) => {
				const fulfillment = await prisma.fulfillment.findFirst({
					where: {
						orderId: order.id,
						vendorId: orderLineItem.sample.vendorId,
					},
				});

				if (!fulfillment)
					throw new Error('Unable to find fulfillment!');

				await prisma.fulfillmentLineItem.create({
					data: {
						orderLineItemId: orderLineItem.id,
						fulfillmentId: fulfillment.id,
					},
				});
			});

			return order;
		});

		return redirect(`/orders/drafts/${response.id}`);
	} catch (e) {
		return badRequest({ errors: { form: 'Unable to complete order.' } });
	}
};

export default function NewOrderPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const search = useFetcher();
	const shippingAddressForm = useRef(null);
	const submit = useSubmit();
	const [cart, setCart] = useState([]);
	const addressFormId = 'address-form';

	return (
		<>
			<header className="page-header">
				{actionData?.errors?.form ? (
					<div>
						<h1 className="headline-h3">Create Order</h1>
						<div className="error message">
							{actionData.errors.form}
						</div>
					</div>
				) : (
					<h1 className="headline-h3">Create Order</h1>
				)}

				<div className="page-header__actions">
					<div className="input">
						<input
							form={addressFormId}
							placeholder="Order Name"
							type="text"
							id="order-name"
							name="orderName"
							defaultValue={data.order?.name}
						/>
					</div>

					<Link className="button" to="..">
						Discard
					</Link>

					<button
						type="button"
						className="primary button full-width"
						onClick={handleSubmit}
					>
						Save
					</button>
				</div>
			</header>

			<div className="foobar">
				<section className="foobar-main-content">
					<h2 className="headline-h6">Search for items</h2>
					<search.Form method="get" action="/swatch">
						<div className="search-bar">
							<SearchIcon
								className="search-icon"
								id="search-icon"
							/>
							<input
								aria-labelledby="search-icon"
								className="search-input"
								type="search"
								name="query"
								id="query"
								placeholder="Search"
								autoComplete="off"
								defaultValue={data.searchHint}
							/>

							<button className="button" type="submit">
								Search
							</button>
						</div>
					</search.Form>

					{search?.data?.errors &&
						search.data.errors.map((error: string) => (
							<div key={error} className="error message">
								{error}
							</div>
						))}

					{/* {data.searchResults ? (
						<code>
							{JSON.stringify(data.searchResults, null, 4)}
						</code>
					) : null} */}

					{search?.data?.results ? (
						<table className="new-order-search-results">
							<tbody>
								<tr>
									<th></th>
									<th className="caption">Material No.</th>
									<th className="caption">Description</th>
								</tr>
								{search.data.results.map((item) => {
									const checked = isAlreadyInCart(item, cart);

									return (
										<tr key={item.id}>
											<td>
												<input
													name="item"
													id={`${item.id}-checkbox`}
													type="checkbox"
													onChange={(e) => {
														handleChange(e, item);
													}}
													value={item.id}
													defaultChecked={checked}
												/>
											</td>
											<td>{item.materialNo}</td>
											<td>
												<label
													className="checkbox-label"
													htmlFor={`${item.id}-checkbox`}
												>
													<div className="title">
														{item.seriesName}
													</div>
													<div className="caption">
														{item.color}
													</div>
												</label>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					) : null}
				</section>

				<aside className="foobar-sidebar sample-cart">
					<Form className="inline-form" method="get" replace>
						<div className="input">
							<label htmlFor="autofill-query">
								Shopify Order No.
							</label>
							<input
								autoFocus
								type="text"
								id="autofill-query"
								name="query"
								defaultValue="#2740"
								placeholder="e.g. #2740"
							/>
						</div>
						<button type="submit" className="button">
							Autofill
						</button>
					</Form>

					<div className="shipping-info">
						<form ref={shippingAddressForm} id={addressFormId}>
							<div className="input input--sm">
								<label htmlFor="ship-to-name">Name</label>
								<input
									type="text"
									autoComplete="name"
									id="ship-to-name"
									name="name"
									defaultValue={
										data.order?.shippingAddress?.name
											? data.order.shippingAddress.name
											: ''
									}
								/>
							</div>

							<div className="input input--sm">
								<label htmlFor="ship-to-address-line-1">
									Street Address
								</label>
								<input
									type="text"
									autoComplete="address-line1"
									id="ship-to-address-1"
									name="address1"
									defaultValue={
										data.order?.shippingAddress?.address1
											? data.order.shippingAddress
													.address1
											: ''
									}
								/>
							</div>

							<div className="input input--sm">
								<label htmlFor="ship-to-address-line-2">
									Suite, Unit, Apt #
								</label>
								<input
									type="text"
									autoComplete="address-line2"
									id="ship-to-address-line-2"
									name="address2"
									defaultValue={
										data.order?.shippingAddress?.address2
											? data.order.shippingAddress
													.address2
											: ''
									}
								/>
							</div>

							<div className="input input--sm">
								<label htmlFor="ship-to-city">City</label>
								<input
									type="text"
									autoComplete="address-level2"
									id="ship-to-city"
									name="city"
									defaultValue={
										data.order?.shippingAddress?.city
											? data.order.shippingAddress.city
											: ''
									}
								/>
							</div>

							<div className="input input--sm">
								<label htmlFor="ship-to-state">State</label>
								<input
									type="text"
									autoComplete="address-level1"
									id="ship-to-state"
									name="province"
									defaultValue={
										data.order?.shippingAddress?.province
											? data.order.shippingAddress
													.province
											: ''
									}
								/>
							</div>

							<div className="input input--sm">
								<label htmlFor="ship-to-zip">ZIP Code</label>
								<input
									type="text"
									autoComplete="postal-code"
									id="ship-to-zip"
									name="zip"
									defaultValue={
										data.order?.shippingAddress?.zip
											? data.order.shippingAddress.zip
											: ''
									}
								/>
							</div>
						</form>
					</div>

					<div style={{ marginTop: 64 }}>
						{cart.length > 0 ? (
							<h2 className="headline-h6">
								Item Count:{' '}
								{cart.reduce(
									(accumulator, item) =>
										accumulator + item.quantity,
									0
								)}
							</h2>
						) : null}

						<ul className="sample-cart-list">
							{cart.map((item) => (
								<li className="sample-cart-item" key={item.id}>
									<div className="sample-cart-item__description">
										<div className="">
											{item.materialNo}
										</div>
									</div>

									<Counter
										min={1}
										name={`quantity-${item.materialNo}`}
										onChange={(quantity) => {
											handleQtyChange(quantity, item);
										}}
										defaultValue={1}
									/>

									<button
										aria-label="Delete"
										className="sample-cart-delete-button"
										onClick={() => {
											removeFromCart(item);
										}}
									>
										<TrashIcon />
									</button>
								</li>
							))}
						</ul>
					</div>
				</aside>
			</div>
		</>
	);

	function handleSubmit() {
		const form = shippingAddressForm.current;
		if (!form) return;

		const address = {
			line1: form['name'].value || undefined,
			line2: form['address1'].value || undefined,
			line3: form['address2'].value || undefined,
			city: form['city'].value || undefined,
			state: form['province'].value || undefined,
			postalCode: form['zip'].value || undefined,
		};

		const orderName = form['orderName'].value;

		let fields: {
			cart: string;
			address: string;
			orderName: string;
		} = {
			cart: JSON.stringify(cart),
			address: JSON.stringify(address),
			orderName: orderName,
		};

		submit(fields, {
			method: 'post',
			encType: 'application/x-www-form-urlencoded',
		});
	}

	function handleQtyChange(quantity, item) {
		const newCartItems = cart.map((cartItem) => {
			if (cartItem.id !== item.id) {
				return cartItem;
			} else {
				return {
					...cartItem,
					quantity: quantity,
				};
			}
		});

		setCart(newCartItems);
	}

	function handleChange(e, item: { id: string }) {
		if (e.target.checked) {
			setCart([...cart, item]);
		} else {
			setCart(cart.filter((cartItem) => cartItem.id !== item.id));
		}
	}

	function isAlreadyInCart(item: { id: string }, cart: any[]): boolean {
		return cart.find((cartItem) => cartItem.id === item.id) ? true : false;
	}

	function removeFromCart(item: { id: string }) {
		setCart(cart.filter((cartItem) => cartItem.id !== item.id));
		const checkbox = document.getElementById(item.id + '-checkbox');
		if (checkbox === null) return;
		checkbox.checked = false;
	}
}
