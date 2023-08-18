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
			<h2>Order ID: {data.order.id}</h2>

			<Link to="labels" target="_blank" reloadDocument>
				Print All
			</Link>

			<ul>
				{data.order.lineItems.map((item) => (
					<li key={item.sku}>
						<div>
							<h3>{item.title}</h3>
							<p>{item.sku}</p>
							<p>{item.vendorProductId}</p>
						</div>

						<button>Print Label</button>
					</li>
				))}
			</ul>
		</div>
	);
}
