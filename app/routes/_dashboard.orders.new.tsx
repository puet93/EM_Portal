import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Outlet, useFetcher, useSubmit } from '@remix-run/react';
import { prisma } from '~/db.server';
import { requireSuperAdmin } from '~/session.server';
import { useState } from 'react';
import { ImageIcon, SearchIcon } from '~/components/Icons';

export const loader: LoaderFunction = async ({ request }) => {
	const user = await requireSuperAdmin(request);

	return json({ user });
};

export const action: ActionFunction = async ({ request }) => {
	const formData = await request.formData();
	const cart = formData.get('cart');

	if (typeof cart !== 'string' || cart.length === 0) {
		return json({ error: 'Unable to read cart.' });
	}

	const parsedCart: { id: string }[] = JSON.parse(cart);
	const order = await prisma.order.create({
		data: {
			items: {
				create: parsedCart.map((item) => ({ productId: item.id })),
			},
		},
	});

	return redirect('/orders/' + order.id);
};

export default function CreateOrderPage() {
	const search = useFetcher();
	const submit = useSubmit();
	const [cart, setCart] = useState([]);

	function handleSubmit() {
		submit(
			{ cart: JSON.stringify(cart) },
			{
				method: 'post',
				encType: 'application/x-www-form-urlencoded',
			}
		);
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

				<button
					className="primary button full-width"
					onClick={handleSubmit}
				>
					Create Order
				</button>

				<Outlet />

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
