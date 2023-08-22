import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import {
	Form,
	useActionData,
	useFetcher,
	useNavigation,
	useSubmit,
} from '@remix-run/react';
import { prisma } from '~/db.server';
import { requireSuperAdmin } from '~/session.server';
import { useState } from 'react';

export const loader: LoaderFunction = async ({ request }) => {
	const user = await requireSuperAdmin(request);

	return json({ user });
};

export const action: ActionFunction = async ({ request }) => {
	const formData = await request.formData();
	const cart = formData.get('cart');
	const parsedCart = JSON.parse(cart);
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

	function handleChange(e, item) {
		if (e.target.checked) {
			setCart([...cart, item]);
		} else {
			setCart(cart.filter((cartItem) => cartItem.id !== item.id));
		}
	}

	function isAlreadyInCart(item, cart): boolean {
		return cart.find((cartItem) => cartItem.id === item.id) ? true : false;
	}

	return (
		<div className="new-order-page">
			<section>
				<search.Form method="post" action="/search">
					<div className="search-bar">
						<input
							className="search-input"
							type="search"
							name="query"
							id="query"
							placeholder="Search"
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

								{search.data.results.map((item) => {
									const checked = isAlreadyInCart(item, cart);

									return (
										<tr key={item.id}>
											<td>
												<input
													type="checkbox"
													onChange={(e) => {
														handleChange(e, item);
													}}
													defaultChecked={checked}
												/>
											</td>
											<td>
												<div className="title">
													{item.title}
												</div>
												<div className="caption">
													{item.sku}
												</div>
											</td>
											<td>{item.vendorProduct.itemNo}</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					) : (
						<div>No results</div>
					)
				) : null}
			</section>

			<aside>
				<button
					className="primary button full-width"
					onClick={handleSubmit}
				>
					Create Order
				</button>

				{cart.map((item) => (
					<div key={item.id}>{item.title}</div>
				))}
			</aside>
		</div>
	);
}
