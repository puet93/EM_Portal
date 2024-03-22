import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useFetcher, useLoaderData, useSubmit } from '@remix-run/react';
import { fetchOrderByName } from '~/utils/shopify.server';
import { prisma } from '~/db.server';
import { useEffect, useRef, useState } from 'react';
import { SearchIcon, TrashIcon } from '~/components/Icons';

import Counter from '~/components/Counter';
import Input from '~/components/Input';

export const loader: LoaderFunction = async ({ request }) => {
	const searchParams = new URL(request.url).searchParams;
	const orderName = searchParams.get('order');

	if (orderName) {
		const order = await fetchOrderByName(orderName);

		let search;
		if (order && order?.lineItems) {
			let skus = order.lineItems.map((item) => item.sku);
			search = skus.join(', ');
		}

		return json({ order, search });
	}

	return json({});
};

export const action: ActionFunction = async ({ params, request }) => {
	const formData = await request.formData();
	const cart = formData.get('cart');
	const address = formData.get('address');

	if (typeof cart !== 'string' || cart.length === 0) {
		return json({ error: 'Unable to get cart.' });
	}

	if (typeof address !== 'string' || address.length === 0) {
		return json({ error: 'Unable to get address.' });
	}

	const parsedCart: { id: string; quantity: string }[] = JSON.parse(cart);
	const parsedAddress = JSON.parse(address);
	const order = await prisma.order.create({
		data: {
			items: {
				create: parsedCart.map((item) => ({
					productId: item.id,
					quantity: Number(item.quantity),
				})),
			},
			address: {
				create: parsedAddress,
			},
		},
	});

	return redirect(`/orders/new/${order.id}`);
};

export default function NewOrderPage() {
	const data = useLoaderData();
	const search = useFetcher();
	const shippingAddressForm = useRef(null);
	const submit = useSubmit();
	const [cart, setCart] = useState([]);

	useEffect(() => {
		console.log('cart', cart);
	}, [cart]);

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

		let fields: {
			cart: string;
			address: string;
		} = {
			cart: JSON.stringify(cart),
			address: JSON.stringify(address),
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

	return (
		<div className="wrapper">
			<header className="page-header">
				<h1 className="headline-h3">Create Order</h1>
			</header>

			<div className="foobar">
				<section className="foobar-main-content">
					<h2 className="headline-h6">Search for items</h2>
					<search.Form method="post" action="/search">
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
								defaultValue={data.search ? data.search : ''}
							/>

							<button className="button" type="submit">
								Search
							</button>
						</div>
					</search.Form>

					{search.data ? (
						search.data.results ? (
							<table className="new-order-search-results">
								<thead>
									<tr>
										<th className="caption"></th>
										<th className="caption">Product</th>
										<th className="caption">
											Florim Item No.
										</th>
										<th>Material No.</th>
									</tr>
								</thead>
								<tbody>
									{search.data.results.map(
										(item: {
											id: string;
											title: string;
											sku: string;
											vendorProduct: { itemNo: string };
										}) => {
											const checked = isAlreadyInCart(
												item,
												cart
											);

											return (
												<tr key={item.id}>
													<td>
														<input
															id={`${item.id}-checkbox`}
															type="checkbox"
															onChange={(e) => {
																handleChange(
																	e,
																	item
																);
															}}
															defaultChecked={
																checked
															}
														/>
													</td>
													<td>
														<label
															className="checkbox-label"
															htmlFor={`${item.id}-checkbox`}
														>
															<div className="title">
																{item.title}
															</div>
															<div className="caption">
																{item.sku}
															</div>
														</label>
													</td>
													<td>
														{item.vendorProduct
															?.itemNo
															? item.vendorProduct
																	.itemNo
															: 'MISSING'}
													</td>
													<td>
														{item.vendorProduct
															.sample
															? item.vendorProduct
																	.sample
																	.materialNo
															: null}
													</td>
												</tr>
											);
										}
									)}
								</tbody>
							</table>
						) : (
							<div>No results</div>
						)
					) : null}
				</section>

				<aside className="foobar-sidebar sample-cart">
					<Form className="inline-form" method="get" replace>
						<Input
							label="Shopify Order No."
							id="order"
							name="order"
							defaultValue={
								data.order?.name ? data.order.name : ''
							}
						/>
						<button type="submit" className="button">
							Get Address
						</button>
					</Form>

					<div className="shipping-info">
						<form ref={shippingAddressForm}>
							<div className="input input--sm">
								<label htmlFor="ship-to-name">Name</label>
								<input
									type="text"
									autoComplete="name"
									id="ship-to-name"
									name="name"
									defaultValue={
										data.order?.shippingAddress?.name
											? data.order?.shippingAddress?.name
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
											? data.order?.shippingAddress
													?.address1
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
											? data.order?.shippingAddress
													?.address2
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
											? data.order?.shippingAddress?.city
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
											? data.order?.shippingAddress
													?.province
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
											? data.order?.shippingAddress?.zip
											: ''
									}
								/>
							</div>

							<button
								type="button"
								className="primary button full-width"
								onClick={handleSubmit}
							>
								Save
							</button>
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
							{cart.map(
								(item: {
									id: string;
									sku: string;
									title: string;
								}) => (
									<li
										className="sample-cart-item"
										key={item.id}
									>
										<div className="sample-cart-item__description">
											<div className="">{item.title}</div>
											<div className="caption">
												{item.sku}
											</div>
										</div>

										<Counter
											min={1}
											name={`quantity-${item.sku}`}
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
								)
							)}
						</ul>
					</div>
				</aside>
			</div>
		</div>
	);
}
