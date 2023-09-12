import type { ActionFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useFetcher, useSubmit } from '@remix-run/react';
import { prisma } from '~/db.server';
import { useState } from 'react';
import { ImageIcon, SearchIcon } from '~/components/Icons';

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

	const parsedCart: { id: string }[] = JSON.parse(cart);
	const parsedAddress = JSON.parse(address);
	const order = await prisma.order.create({
		data: {
			items: {
				create: parsedCart.map((item) => ({ productId: item.id })),
			},
			address: {
				create: parsedAddress,
			},
		},
	});

	return redirect(`/orders/new/${order.id}`);
};

export default function NewOrderPage() {
	const search = useFetcher();
	const submit = useSubmit();
	const [cart, setCart] = useState([]);
	const [address, setAddress] = useState({
		line1: undefined,
		line2: undefined,
		line3: undefined,
		city: undefined,
		state: undefined,
		postalCode: undefined,
	});

	function handleDiscard() {
		window.alert('You sure?');
	}

	function handleSubmit() {
		let fields: {
			cart: string;
			address: string;
		} = {
			cart: JSON.stringify(cart),
			address: JSON.stringify(address),
		};

		console.log('fields', fields);

		submit(fields, {
			method: 'post',
			encType: 'application/x-www-form-urlencoded',
		});
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
		<div className="new-order-page">
			<header className="page-header">
				<h1 className="headline-h3">Create Order</h1>
			</header>

			<section>
				<h2 className="headline-h6">Search for items</h2>
				<search.Form method="post" action="/search">
					<div className="search-bar">
						<SearchIcon className="search-icon" id="search-icon" />
						<input
							aria-labelledby="search-icon"
							className="search-input"
							type="search"
							name="query"
							id="query"
							placeholder="Search"
							autoComplete="off"
						/>

						<button className="button" type="submit">
							Search
						</button>
					</div>
				</search.Form>

				{search.data ? (
					search.data.results ? (
						<table className="new-order-search-results">
							<tbody>
								<tr>
									<th className="caption"></th>
									<th className="caption">Product</th>
									<th className="caption">Florim Item No.</th>
								</tr>

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
														defaultChecked={checked}
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
													{item.vendorProduct.itemNo}
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

			<aside className="sample-cart">
				<h2 className="headline-h6">Selected Samples</h2>

				<div className="sample-cart-actions">
					<button
						className="primary button full-width"
						onClick={handleSubmit}
					>
						Save
					</button>

					<button onClick={handleDiscard} className="button">
						Discard
					</button>
				</div>

				<div className="shipping-info">
					<div className="input input--sm">
						<label htmlFor="ship-to-name">Name</label>
						<input
							type="text"
							autoComplete="name"
							id="ship-to-name"
							value={address?.line1 ? address.line1 : ''}
							onChange={(e) =>
								setAddress({
									...address,
									line1: e.target.value,
								})
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
							value={address.line2 ?? ''}
							onChange={(e) =>
								setAddress({
									...address,
									line2: e.target.value,
								})
							}
						/>
					</div>

					<div className="input input--sm">
						<label htmlFor="ship-to-address-line-2">
							Suite, Unit, Apt #
						</label>
						<input
							type="text"
							name="line2"
							autoComplete="address-line2"
							id="ship-to-address-line-2"
							value={address.line3 ?? ''}
							onChange={(e) =>
								setAddress({
									...address,
									line3: e.target.value,
								})
							}
						/>
					</div>

					<div className="input input--sm">
						<label htmlFor="ship-to-city">City</label>
						<input
							type="text"
							name="city"
							autoComplete="address-level2"
							id="ship-to-city"
							value={address.city ?? ''}
							onChange={(e) =>
								setAddress({
									...address,
									city: e.target.value,
								})
							}
						/>
					</div>

					<div className="input input--sm">
						<label htmlFor="ship-to-state">State</label>
						<input
							type="text"
							name="state"
							autoComplete="address-level1"
							id="ship-to-state"
							value={address.state ?? ''}
							onChange={(e) =>
								setAddress({
									...address,
									state: e.target.value,
								})
							}
						/>
					</div>

					<div className="input input--sm">
						<label htmlFor="ship-to-zip">ZIP Code</label>
						<input
							type="text"
							name="postalCode"
							autoComplete="postal-code"
							id="ship-to-zip"
							value={address.postalCode ?? ''}
							onChange={(e) =>
								setAddress({
									...address,
									postalCode: e.target.value,
								})
							}
						/>
					</div>
				</div>

				<ul className="sample-cart-list">
					{cart.map(
						(item: { id: string; sku: string; title: string }) => (
							<li className="sample-cart-item" key={item.id}>
								<div className="sample-cart-img">
									<ImageIcon />
								</div>
								<div>
									<div className="caption caption--bold">
										{item.title}
									</div>
									<div className="caption-2">{item.sku}</div>
								</div>
								<button
									aria-label="Delete"
									className="sample-cart-delete-button"
									onClick={() => {
										removeFromCart(item);
									}}
								></button>
							</li>
						)
					)}
				</ul>
			</aside>
		</div>
	);
}
