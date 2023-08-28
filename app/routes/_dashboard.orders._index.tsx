import type { ActionFunction, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { getOrders } from '~/orders.server';
import { prisma } from '~/db.server';
import { TrashIcon } from '~/components/Icons';

export const loader = async ({ request }: LoaderArgs) => {
	const orders = await getOrders();
	return json({ orders });
};

export const action: ActionFunction = async ({ request }) => {
	const formData = await request.formData();
	const action = formData.get('_action');
	const orderId = formData.get('orderId');

	if (typeof action !== 'string' || typeof orderId !== 'string') {
		return json({ error: 'Invalid form data' });
	}

	if (action == 'delete') {
		await prisma.$transaction([
			prisma.orderItem.deleteMany({ where: { orderId: orderId } }),
			prisma.order.delete({
				where: { id: orderId },
			}),
		]);
		return json({});
	}

	return json({});
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
						<th className="caption">Status</th>
						<th className="caption">Order No.</th>
						<th></th>
						<th></th>
					</tr>

					{data.orders.map((order) => (
						<tr key={order.id}>
							<td>
								<span
									className={`${order.status.toLowerCase()} badge`}
								>
									{order.status}
								</span>
							</td>
							<td>
								<Link to={order.id}>{order.id}</Link>
							</td>
							<td>
								<Link className="button" to={'new/' + order.id}>
									Edit
								</Link>
							</td>
							<td>
								<Form method="post">
									<input
										type="hidden"
										name="orderId"
										value={order.id}
									/>
									<button
										className="destructive button button--icon"
										type="submit"
										name="_action"
										value="delete"
									>
										Delete
									</button>
								</Form>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
