import type { ActionFunction, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';
import { EditIcon, TrashIcon } from '~/components/Icons';
import Input from '~/components/Input';
import type { OrderStatus } from '@prisma/client';

const statusFilters = [
	{ label: 'Draft', value: 'DRAFT' },
	{ label: 'New', value: 'NEW' },
	{ label: 'Processing', value: 'PROCESSING' },
	{ label: 'Complete', value: 'COMPLETE' },
	{ label: 'Cancelled', value: 'CANCELLED' },
];

export const loader = async ({ request }: LoaderArgs) => {
	const searchParams = new URL(request.url).searchParams;
	let filters = ['DRAFT', 'NEW'];
	let newFilters = [];
	let name = '';

	for (const [key, value] of searchParams) {
		if (key === 'status') {
			newFilters.push(value);
			continue;
		}

		if (key === 'name') {
			name = value;
			continue;
		}
	}

	if (newFilters.length !== 0) {
		filters = newFilters;
	}

	const addresses = await prisma.address.findMany({
		where: {
			line1: {
				contains: name,
			},
		},
	});

	const orders = await prisma.order.findMany({
		where: {
			status: {
				in: filters as OrderStatus[],
			},
			address: {
				id: { in: addresses?.map((address) => address.id) },
			},
		},
		include: {
			address: true,
		},
		orderBy: {
			createdAt: 'desc',
		},
	});
	return json({ orders, filters, name });
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

						{statusFilters.map(({ label, value }) => (
							<label key={value}>
								<input
									type="checkbox"
									name="status"
									value={value}
									defaultChecked={data.filters.includes(
										value
									)}
								/>
								{label}
							</label>
						))}
					</fieldset>

					<Input
						label="Search by name"
						name="name"
						id="name"
						defaultValue={data.name}
					/>

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
