import type { ActionFunction, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';
import { EditIcon, TrashIcon } from '~/components/Icons';
import Input from '~/components/Input';
import type { FulfillmentStatus, OrderStatus } from '@prisma/client';
import { requireUser } from '~/session.server';

const statusFilters = [
	{ label: 'Draft', value: 'DRAFT' },
	{ label: 'New', value: 'NEW' },
	{ label: 'Processing', value: 'PROCESSING' },
	{ label: 'Complete', value: 'COMPLETE' },
	{ label: 'Cancelled', value: 'CANCELLED' },
];

export const loader = async ({ request }: LoaderArgs) => {
	const user = await requireUser(request);
	const searchParams = new URL(request.url).searchParams;
	let filters = ['DRAFT', 'NEW'];
	let fulfillmentStatusFilters = [
		'NEW',
		'PROCESSING',
		'COMPLETE',
		'CANCELLED',
		'ERROR',
	];
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
				mode: 'insensitive',
			},
		},
	});

	const fulfillments = await prisma.fulfillment.findMany({
		where: {
			status: {
				in: fulfillmentStatusFilters as FulfillmentStatus[],
			},
			vendorId: user.role === 'SUPERADMIN' ? {} : user.vendorId,
		},
		include: {
			trackingInfo: true,
			vendor: true,
			order: {
				include: {
					address: true,
				},
			},
		},
	});

	if (user.role !== 'SUPERADMIN')
		return json({ filters, fulfillments, name, orders: null });

	const orders = await prisma.order.findMany({
		where: {
			status: {
				in: filters as OrderStatus[],
			},
			OR: [
				{ id: { contains: name } },
				{
					address: {
						id: { in: addresses?.map((address) => address.id) },
					},
				},
			],
		},
		include: {
			address: true,
		},
		orderBy: {
			createdAt: 'desc',
		},
	});

	return json({ filters, fulfillments, name, orders });
};

export const action: ActionFunction = async ({ request }) => {
	const formData = await request.formData();
	const action = formData.get('_action');
	const orderId = formData.get('orderId');

	if (typeof action !== 'string' || typeof orderId !== 'string') {
		return json({ error: 'Invalid form data' });
	}

	if (action == 'delete') {
		await prisma.$transaction(async (tx) => {
			const fulfillments = await prisma.fulfillment.findMany({
				where: { orderId: orderId },
			});

			fulfillments.map(async (fulfillment) => {
				await prisma.fulfillment.update({
					where: { id: fulfillment.id },
					data: {
						lineItems: {
							deleteMany: {},
						},
					},
				});
			});

			await prisma.order.update({
				where: { id: orderId },
				data: {
					items: {
						deleteMany: {},
					},
					lineItems: {
						deleteMany: {},
					},
					fulfillments: {
						deleteMany: {},
					},
				},
			});

			await prisma.order.delete({
				where: { id: orderId },
			});
		});

		return json({});
	}

	return json({});
};

export default function OrderIndex() {
	const data = useLoaderData<typeof loader>();

	return (
		<>
			<header className="page-header">
				<h1 className="headline-h3">Orders</h1>

				<div className="page-header__actions">
					<Link to="new" className="primary button">
						Create Order
					</Link>
				</div>
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
						label="Search by name or order number"
						name="name"
						id="name"
						defaultValue={data.name}
					/>

					<button className="primary button" type="submit">
						Search
					</button>
				</Form>
			</div>

			{data.fulfillments ? (
				<table>
					<tbody>
						<tr>
							<th>Order No.</th>
							<th>Name</th>
							<th>Shipping Address</th>
							<th>Tracking Info</th>
							<th>Status</th>
							<th></th>
						</tr>
						{data.fulfillments.map((fulfillment) => (
							<tr key={fulfillment.id}>
								<td>
									<Link
										to={`/fulfillments/${fulfillment.id}`}
									>
										{fulfillment.name}
									</Link>
								</td>
								<td>
									<Link
										to={`/fulfillments/${fulfillment.id}`}
									>
										{fulfillment.order.address.line1}
									</Link>
								</td>
								<td>
									<Link
										to={`/fulfillments/${fulfillment.id}`}
									>
										<address className="text">
											{fulfillment.order.address.line2 &&
												`${fulfillment.order.address.line2}\n`}
											{fulfillment.order.address.line3 &&
												`${fulfillment.order.address.line3}\n`}
											{fulfillment.order.address.line4 &&
												`${fulfillment.order.address.line4}\n`}
											{fulfillment.order.address.city},{' '}
											{fulfillment.order.address.state}{' '}
											{
												fulfillment.order.address
													.postalCode
											}
										</address>
									</Link>
								</td>
								<td>
									<Link
										to={`/fulfillments/${fulfillment.id}`}
									>
										{fulfillment.trackingInfo?.number ? (
											<>
												<div>
													{
														fulfillment.trackingInfo
															.number
													}
												</div>
												<div className="caption">
													{
														fulfillment.trackingInfo
															.company
													}
												</div>
											</>
										) : (
											<span className="caption">
												Add tracking info
											</span>
										)}
									</Link>
								</td>
								<td>
									<Link
										to={`/fulfillments/${fulfillment.id}`}
									>
										<span
											className={`${fulfillment.status.toLowerCase()} badge`}
										>
											{fulfillment.status}
										</span>
									</Link>
								</td>
								<td>
									<Link
										to={`/fulfillments/${fulfillment.id}`}
									>
										{fulfillment.vendor?.name}
									</Link>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			) : null}

			{data.orders ? (
				<>
					<div>
						<h2 className="headline-h5">Old System</h2>
						<p>
							The section below will be phased out and will only
							appear to Edward Martin. Vendors cannot interact
							with this.
						</p>
					</div>

					<table>
						<thead>
							<tr>
								<th>Name</th>
								<th>Created</th>
								<th>Order No.</th>
								<th>Status</th>
								<th>
									<span className="visually-hidden">
										Actions
									</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{data.orders.map((order) => {
								const address = order.address;
								const { city, state, postalCode } = address;
								const date = new Date(
									order.createdAt
								).toLocaleString('en-US');

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
										<td className="caption">
											{order.name ? order.name : order.id}
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
													to={`drafts/${order.id}`}
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
				</>
			) : null}
		</>
	);
}
