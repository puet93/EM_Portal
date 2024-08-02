import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { OrderStatus } from '@prisma/client';
import { prisma } from '~/db.server';
import { EditIcon, TrashIcon } from '~/components/Icons';
import Input from '~/components/Input';
import { requireSuperAdmin } from '~/session.server';
import { toCapitalCase } from '~/utils/helpers';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import DropdownMultiSelect from '~/components/DropdownMultiSelect';

export const loader: LoaderFunction = async ({ request }) => {
	await requireSuperAdmin(request);

	const searchParams = new URL(request.url).searchParams;
	const _action = searchParams.get('_action');
	const query = searchParams.get('query');

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
	let name = '';

	for (const [key, value] of searchParams) {
		if (key === 'name') {
			name = value;
			continue;
		}
	}

	const vendors = await getVendors();

	let vendorOptions;
	if (vendors) {
		vendorOptions = createDropdownOptions({
			array: vendors,
			labelKey: 'name',
			valueKey: 'id',
		});
	}

	return json({
		name,
		orders: await getOrders(name, selectedOrderStatuses),
		orderStatusDropdownName,
		orderStatusOptions,
		orderStatusDefaults,
		query,
		vendorOptions,
	});
};

export const action: ActionFunction = async ({ request }) => {
	const formData = await request.formData();
	const _action = formData.get('_action');

	switch (_action) {
		case 'complete': {
			const id = formData.get('id');
			if (typeof id !== 'string' || id.length === 0) {
				return json({ error: 'Invalid form data' });
			}
			const fulfillment = await prisma.fulfillment.update({
				where: { id },
				data: {
					status: 'COMPLETE',
				},
			});
			return json({ fulfillment });
		}
		case 'processing': {
			const id = formData.get('id');
			if (typeof id !== 'string' || id.length === 0) {
				return json({ error: 'Invalid form data' });
			}
			const fulfillment = await prisma.fulfillment.update({
				where: { id },
				data: {
					status: 'PROCESSING',
				},
			});
			return json({ fulfillment });
		}
		case 'new': {
			const id = formData.get('id');
			if (typeof id !== 'string' || id.length === 0) {
				return json({ error: 'Invalid form data' });
			}
			const fulfillment = await prisma.fulfillment.update({
				where: { id },
				data: {
					status: 'NEW',
				},
			});
			return json({ fulfillment });
		}
		case 'delete': {
			const orderId = formData.get('orderId');
			if (typeof orderId !== 'string' || orderId.length === 0) {
				return json({ error: 'Invalid form data' });
			}
			const order = await prisma.$transaction(async (tx) => {
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
			return json({ order });
		}
		default: {
			return json({ error: 'Invalid form data' });
		}
	}
};

export default function OrdersPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<>
			<div className="border-b border-gray-200 pb-0">
				<div className="mt-4">
					<div className="block">
						<nav className="-mb-px flex space-x-8">
							{/* <!-- Current: "border-indigo-500 text-indigo-600", Default: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700" --> */}
							<Link
								to="../"
								className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
								aria-current="page"
							>
								Fulfillments
							</Link>
							<div className="border-indigo-500 text-indigo-600">
								Order Admin
							</div>
						</nav>
					</div>
				</div>
			</div>

			{data.orders ? <Orders data={data} /> : null}
		</>
	);
}

function FulfillmentStatusBadge({ status }) {
	let className;
	switch (status) {
		case 'ERROR':
		case 'CANCELLED':
			className =
				'inline-flex items-center rounded-md bg-red-400/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-400/20';
			break;
		case 'PROCESSING':
		case 'WARNING':
			className =
				'inline-flex items-center rounded-md bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-500 ring-1 ring-inset ring-yellow-400/20';
			break;
		case 'SUCCESS':
		case 'COMPLETE':
			className =
				'inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20';
			break;
		case 'NEW':
			className =
				'inline-flex items-center rounded-md bg-blue-400/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-400/30';
			break;
		default:
			className =
				'inline-flex items-center rounded-md bg-gray-400/10 px-2 py-1 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-400/20';
	}

	return <span className={className}>{toCapitalCase(status)}</span>;
}

function Orders({ data }) {
	return (
		<section className="page-section">
			<div className="page-section-header">
				<h2 className="headline-h5">Old System</h2>
				<p>
					The section below only appears to Edward Martin and will be
					phased out entirely. Vendors cannot interact with this.
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
							<span className="visually-hidden">Actions</span>
						</th>
					</tr>
				</thead>
				<tbody>
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
								<td className="caption">
									{order.name ? order.name : order.id}
								</td>
								<td>
									<FulfillmentStatusBadge
										status={order.status}
									/>
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
	);
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

	// const page = Number(url.searchParams.get('page')) || 1;
	// const pageSize = Number(url.searchParams.get('pageSize')) || 10;
	// const skip = (page - 1) * pageSize;

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

async function getVendors() {
	return prisma.vendor.findMany();
}

function createDropdownOptions({
	array,
	labelKey,
	valueKey,
}: {
	array: any[];
	labelKey: string;
	valueKey: string;
}) {
	return array.map((item) => ({
		label: item[labelKey],
		value: item[valueKey],
	}));
}
