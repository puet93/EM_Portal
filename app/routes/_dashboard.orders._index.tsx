import type { ActionFunction, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';
import { EditIcon, TrashIcon } from '~/components/Icons';

export const loader = async ({ request }: LoaderArgs) => {
	const orders = await prisma.order.findMany({
		include: {
			address: true,
		},
		orderBy: {
			createdAt: 'desc',
		},
	});

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

			<div className="table-toolbar">
				<Link className="primary button" to="new">
					Create New Order
				</Link>
			</div>

			<table>
				<tbody>
					<tr>
						<th className="caption">Name</th>
						<th className="caption">Location</th>
						<th className="caption">Status</th>
						<th>
							<span className="visually-hidden">Actions</span>
						</th>
					</tr>

					{data.orders.map((order) => {
						const address = order.address;
						const { city, state, postalCode } = address;
						return (
							<tr key={order.id}>
								<td>
									<Link to={order.id}>
										<div className="title">
											{order.address.line1}
										</div>
										<div className="caption">
											{order.id}
										</div>
									</Link>
								</td>
								<td className="caption">
									{city && state && postalCode
										? `${city}, ${state} ${postalCode}`
										: 'Unknown'}
								</td>
								<td>
									<span
										className={`${order.status.toLowerCase()} badge`}
									>
										{order.status}
									</span>
								</td>

								<td>
									<div className="table-row-actions">
										<Link
											className="circle-button"
											to={'new/' + order.id}
										>
											<span className="visually-hidden">
												Edit
											</span>
											<EditIcon />
										</Link>
										<Form method="post">
											<input
												type="hidden"
												name="orderId"
												value={order.id}
											/>
											<button
												className="destructive circle-button"
												type="submit"
												name="_action"
												value="delete"
											>
												<span className="visually-hidden">
													Delete
												</span>
												<TrashIcon />
											</button>
										</Form>
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
