import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { getOrders } from '~/orders.server';

export const loader = async ({ request }: LoaderArgs) => {
	const orders = await getOrders();
	return json({ orders });
};

export default function OrderIndex() {
	const data = useLoaderData<typeof loader>();
	return (
		<div className="orders-index-page">
			<header>
				<h1 className="headline-h3">Orders</h1>
			</header>

			<Link className="primary button" to="new">
				Create New Order
			</Link>

			<table>
				<tbody>
					<tr>
						<th className="caption">Order No.</th>
						<th className="caption">Status</th>
					</tr>

					{data.orders.map((order) => (
						<tr key={order.id}>
							<td>
								<Link to={order.id}>{order.id}</Link>
							</td>
							<td>{order.status}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
