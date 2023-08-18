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
		<div>
			<Link to="new">Create New Order</Link>

			<table>
				<tbody>
					<tr>
						<th>Select</th>
						<th>Order No.</th>
					</tr>

					{data.orders.map((order) => (
						<tr key={order.id}>
							<td>
								<input type="checkbox" value={order.id} />
							</td>
							<td>
								<Link to={order.id}>{order.id}</Link>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
