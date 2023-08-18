import type { ActionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useFetcher, useSubmit } from '@remix-run/react';
import { useState } from 'react';

export const action = async ({ request }: ActionArgs) => {
	const formData = await request.formData();
	const cartString = formData.get('cart');

	if (typeof cartString !== 'string') {
		return json({ message: 'error' }, 500); // TODO: Redo this.
	}

	const cart = JSON.parse(cartString);
	console.log(cart);

	// Create a new order here
	// const order = await prisma.order.create();

	return redirect('/orders');
};

export default function NewOrderPage() {
	const search = useFetcher();
	const submit = useSubmit();
	const [cart, setCart] = useState([]);

	function addItem(item) {
		setCart([...cart, item]);
	}

	function handleSubmit() {
		const formData = new FormData();
		formData.set('cart', JSON.stringify({ items: cart }));
		submit(formData, { method: 'post' });
	}

	return (
		<div className="new-order-page">
			<div className="new-order-search">
				<search.Form method="post" action="/search">
					<h2>Search</h2>

					<div className="search-bar">
						<div className="input">
							<label htmlFor="query">
								Search by SKU, vendor item number, or name
							</label>
							<input
								id="query"
								name="query"
								type="search"
								placeholder="e.g. 10001, 10004, Aniston 12x24, 1102328"
							/>
						</div>
						<button type="submit">Search</button>
					</div>
				</search.Form>

				{search.data ? (
					<div className="new-order-search-results">
						<table>
							<tbody>
								<tr>
									<th>Title</th>
									<th>SKU</th>
									<th>Florim Item No.</th>
									<th></th>
								</tr>
								{search.data.results.length > 0 ? (
									search.data.results.map((result) => (
										<tr key={result.id}>
											<td>{result.title}</td>
											<td>{result.sku}</td>
											<td>
												{result.vendorProduct.itemNo}
											</td>
											<td>
												<button
													className="button"
													onClick={() => {
														addItem(result);
													}}
												>
													Add to Cart
												</button>
											</td>
										</tr>
									))
								) : (
									<div>No results</div>
								)}
							</tbody>
						</table>
					</div>
				) : null}
			</div>

			<div className="new-order-cart">
				<form method="post">
					<h2>Cart</h2>
					<button
						className="primary button"
						type="button"
						onClick={handleSubmit}
					>
						Place Order
					</button>
					<ul>
						{cart.map((item) => (
							<li key={item.sku}>
								<div>{item.title}</div>
								<div>{item.sku}</div>
							</li>
						))}
					</ul>
				</form>
			</div>
		</div>
	);
}
