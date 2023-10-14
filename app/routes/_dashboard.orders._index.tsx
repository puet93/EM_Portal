import type { ActionFunction, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';
import { EditIcon, TrashIcon } from '~/components/Icons';
import Dropdown from '~/components/Dropdown';
import Input from '~/components/Input';
import { OrderStatus } from '@prisma/client';

export const loader = async ({ request }: LoaderArgs) => {
	const searchParams = new URL(request.url).searchParams;
	let filters: OrderStatus[] = ['DRAFT', 'NEW'];
	let statusArray: OrderStatus[] = [];

	for (const [key, value] of searchParams) {
		if (key === 'status') {
			statusArray.push(value as OrderStatus);
		}
	}

	if (statusArray.length !== 0) {
		filters = statusArray;
	}

	const orders = await prisma.order.findMany({
		where: {
			status: {
				in: filters,
			},
		},
		include: {
			address: true,
		},
		orderBy: {
			createdAt: 'desc',
		},
	});
	return json({ orders, filters });
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
				<Form method="get" className="inline-form" replace>
					<fieldset style={{ display: 'flex' }}>
						<legend>Status</legend>

						<label>
							<input
								type="checkbox"
								name="status"
								value="DRAFT"
								defaultChecked={data.filters.includes('DRAFT')}
							/>
							Draft
						</label>
						<label>
							<input
								type="checkbox"
								name="status"
								value="NEW"
								defaultChecked={data.filters.includes('NEW')}
							/>
							New
						</label>
						<label>
							<input
								type="checkbox"
								name="status"
								value="PROCESSING"
								defaultChecked={data.filters.includes(
									'PROCESSING'
								)}
							/>
							Processing
						</label>
						<label>
							<input
								type="checkbox"
								name="status"
								value="COMPLETE"
								defaultChecked={data.filters.includes(
									'COMPLETE'
								)}
							/>
							Complete
						</label>
						<label>
							<input
								type="checkbox"
								name="status"
								value="CANCELLED"
								defaultChecked={data.filters.includes(
									'CANCELLED'
								)}
							/>
							Cancelled
						</label>
					</fieldset>

					<button className="button" type="submit">
						Filter
					</button>
				</Form>

				<Link className="primary button" to="new">
					Create New Order
				</Link>
			</div>

			<table>
				<tbody>
					<tr>
						<th className="caption">Name</th>
						<th className="caption">Created</th>
						<th className="caption">Order No.</th>
						<th className="caption">Status</th>
						<th>
							<span className="visually-hidden">Actions</span>
						</th>
					</tr>

					{data.orders.map((order) => {
						const address = order.address;
						const { city, state, postalCode } = address;
						const date = new Date(order.createdAt).toLocaleString(
							'en-US'
						);

						return (
							<tr key={order.id}>
								<td>
									<Link to={order.id}>
										<div className="title">
											{order.address.line1}
										</div>
										{city && state && postalCode ? (
											<div className="caption">{`${city}, ${state} ${postalCode}`}</div>
										) : null}
									</Link>
								</td>
								<td>{date}</td>
								<td className="caption">{order.id}</td>
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
