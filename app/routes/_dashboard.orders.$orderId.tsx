import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { getOrder } from '~/orders.server';

export const loader = async ({ params, request }: LoaderArgs) => {
	await requireUserId(request);
	const order = await getOrder(params.orderId);
	return json({ order });
};

export default function OrderPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div>
			<Link to="/orders">Go Back</Link>

			<h2>Order ID: {data.order?.id}</h2>

			<Link
				className="primary button"
				to="labels"
				target="_blank"
				reloadDocument
			>
				Print All
			</Link>

			<ul className="order-list">
				{data.order?.items.map((item) => (
					<li className="order-list-item" key={item.id}>
						<div>
							<h3>{item.product.title}</h3>
							<p>{item.product.sku}</p>
							<p>{item.product.vendorProduct.itemNo}</p>
						</div>

						<button className="button button--sm">
							Print Label
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
