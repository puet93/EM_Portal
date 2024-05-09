import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { FulfillmentStatus, OrderStatus } from '@prisma/client';
import { prisma } from '~/db.server';
import { EditIcon, TrashIcon } from '~/components/Icons';
import Input from '~/components/Input';
import { requireUser } from '~/session.server';
import { toCapitalCase } from '~/utils/helpers';
import type { ActionFunction, LoaderFunctionArgs } from '@remix-run/node';
import DropdownMultiSelect from '~/components/DropdownMultiSelect';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const user = await requireUser(request);
	const searchParams = new URL(request.url).searchParams;
	const _action = searchParams.get('_action');

	// Order status dropdown
	const orderStatusDefaults: OrderStatus[] = ['DRAFT', 'NEW'];
	const orderStatusDropdownName: string = 'selectedStatuses';
	const orderStatusOptions: { value: OrderStatus; label: string }[] =
		Object.values(OrderStatus).map((status) => {
			return { value: status, label: toCapitalCase(status) };
		});

	let selectedOrderStatuses = orderStatusDefaults;
	if (_action === 'search-orders') {
		selectedOrderStatuses = searchParams.getAll(
			orderStatusDropdownName
		) as OrderStatus[];
	}

	// New fulfillment system status
	const fulfillmentStatuses = Object.values(FulfillmentStatus).map(
		(status) => {
			return { value: status, label: toCapitalCase(status) };
		}
	);
	let fulfillmentStatusFilters: FulfillmentStatus[] = ['NEW'];
	let newFulfillmentStatusFilters: FulfillmentStatus[] = [];
	let fulfillmentStatusQuery = 'NEW';

	let name = '';

	for (const [key, value] of searchParams) {
		if (key === 'fulfillmentStatus') {
			newFulfillmentStatusFilters.push(value as FulfillmentStatus);
			fulfillmentStatusQuery = value;
			continue;
		}

		if (key === 'name') {
			name = value;
			continue;
		}
	}

	if (newFulfillmentStatusFilters.length !== 0) {
		fulfillmentStatusFilters = newFulfillmentStatusFilters;
	}

	let fulfillments;
	if (typeof user.vendorId === 'string' && user.vendorId.length !== 0) {
		fulfillments = await getFulfillmentsByVendor({
			vendorId: user.vendorId,
			fulfillmentStatuses: fulfillmentStatusFilters,
		});
	}

	if (user.role === 'SUPERADMIN') {
		fulfillments = await getFulfillments(fulfillmentStatusFilters);
	}

	return json({
		fulfillments,
		fulfillmentStatuses,
		fulfillmentStatusQuery,
		name,
		orders:
			user.role !== 'SUPERADMIN'
				? null
				: await getOrders(name, selectedOrderStatuses),
		orderStatusDropdownName,
		orderStatusOptions,
		orderStatusDefaults,
		userRole: user.role,
	});
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
				<div className="page-header__row">
					<h1 className="headline-h3">Orders</h1>
					{data.userRole === 'SUPERADMIN' ? (
						<div className="page-header__actions">
							<Link to="new" className="primary button">
								Create Order
							</Link>
						</div>
					) : null}
				</div>
			</header>

			{data.fulfillments ? (
				<section className="page-section">
					<Form method="get" replace className="segmented-controls">
						{data.fulfillmentStatuses.map((status) => (
							<button
								key={status.value}
								type="submit"
								name="fulfillmentStatus"
								value={status.value}
								className={
									data.fulfillmentStatusQuery === status.value
										? 'segmented-control is-active'
										: 'segmented-control'
								}
							>
								{status.label}
							</button>
						))}
					</Form>

					<table>
						<thead>
							<tr>
								<th>Order No.</th>
								<th>Name</th>
								<th>Shipping Address</th>
								<th>Tracking Info</th>
								<th>Status</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{data.fulfillments.map((fulfillment) => (
								<tr key={fulfillment.id}>
									<td>
										<Link
											to={`/fulfillments/${fulfillment.id}`}
										>
											<div>{fulfillment.name}</div>
											<div className="caption">
												{new Date(
													fulfillment.order.createdAt
												).toLocaleString('en-US')}
											</div>
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
												{fulfillment.order.address
													.line2 &&
													`${fulfillment.order.address.line2}\n`}
												{fulfillment.order.address
													.line3 &&
													`${fulfillment.order.address.line3}\n`}
												{fulfillment.order.address
													.line4 &&
													`${fulfillment.order.address.line4}\n`}
												{fulfillment.order.address.city}
												,{' '}
												{
													fulfillment.order.address
														.state
												}{' '}
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
											{fulfillment.trackingInfo
												?.number ? (
												<>
													<div>
														{
															fulfillment
																.trackingInfo
																.number
														}
													</div>
													<div className="caption">
														{
															fulfillment
																.trackingInfo
																.company
														}
													</div>
												</>
											) : (
												<span className="caption">
													Needs tracking info
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
				</section>
			) : null}

			{data.orders ? (
				<section className="page-section">
					<div className="page-section-header">
						<h2 className="headline-h5">Old System</h2>
						<p>
							The section below only appears to Edward Martin and
							will be phased out entirely. Vendors cannot interact
							with this.
						</p>
					</div>

					<div className="table-toolbar">
						<Form method="get" replace preventScrollReset={true}>
							<div className="input">
								<label>Order Status</label>
								<DropdownMultiSelect
									name={data.orderStatusDropdownName}
									options={data.orderStatusOptions}
									defaultValue={data.orderStatusDefaults}
								/>
							</div>

							<Input
								label="Search by name or order number"
								name="name"
								id="name"
								defaultValue={data.name}
							/>

							<button
								className="primary button"
								type="submit"
								name="_action"
								value="search-orders"
							>
								Search
							</button>
						</Form>
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
				</section>
			) : null}
		</>
	);
}

async function getFulfillments(fulfillmentStatuses: FulfillmentStatus[]) {
	return await prisma.fulfillment.findMany({
		where: {
			status: {
				in: fulfillmentStatuses,
			},
			order: {
				status: { not: 'DRAFT' },
			},
		},
		orderBy: {
			order: {
				createdAt: 'desc',
			},
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
}

async function getFulfillmentsByVendor({
	fulfillmentStatuses,
	vendorId = undefined,
}: {
	fulfillmentStatuses: FulfillmentStatus[];
	vendorId?: string;
}) {
	return await prisma.fulfillment.findMany({
		where: {
			status: {
				in: fulfillmentStatuses,
			},
			order: {
				status: { not: 'DRAFT' },
			},
			vendorId,
		},
		orderBy: {
			order: {
				createdAt: 'desc',
			},
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
}

async function getOrders(name: string, orderStatuses: OrderStatus[]) {
	const addresses = await prisma.address.findMany({
		where: {
			line1: {
				contains: name,
				mode: 'insensitive',
			},
		},
	});

	return await prisma.order.findMany({
		where: {
			status: {
				in: orderStatuses.length !== 0 ? orderStatuses : undefined,
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
}
