import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { FulfillmentStatus, OrderStatus } from '@prisma/client';
import { prisma } from '~/db.server';
import { EditIcon, TrashIcon } from '~/components/Icons';
import Input from '~/components/Input';
import { requireUser } from '~/session.server';
import { toCapitalCase } from '~/utils/helpers';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import DropdownMultiSelect from '~/components/DropdownMultiSelect';

export const loader: LoaderFunction = async ({ request }) => {
	const user = await requireUser(request);
	const searchParams = new URL(request.url).searchParams;
	const _action = searchParams.get('_action');
	const query = searchParams.get('query');

	// TODO: DELETE
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
	let name = '';

	for (const [key, value] of searchParams) {
		if (key === 'name') {
			name = value;
			continue;
		}
	}
	// END TODO

	// Create dropdown options from FulfillmentStatus object
	const fulfillmentStatuses = Object.values(FulfillmentStatus).map(
		(status) => {
			return { value: status, label: toCapitalCase(status) };
		}
	);

	// Set default values
	let selectedFulfillmentStatuses: FulfillmentStatus[] = [
		'NEW',
		'PROCESSING',
	];

	let fulfillments;

	// Loads initial data
	if (_action !== 'search') {
		console.log('LOADING INITIAL DATA');

		// Loads initial data for external user / vendor employees
		if (typeof user.vendorId === 'string' && user.vendorId.length !== 0) {
			fulfillments = await getFulfillmentsByVendor({
				query: undefined,
				vendorId: user.vendorId,
				fulfillmentStatuses: selectedFulfillmentStatuses,
			});
		}

		// Loads initial data for superadmins / Edward Martin employees
		if (user.role === 'SUPERADMIN' && _action !== 'search') {
			fulfillments = await getFulfillments(
				undefined,
				selectedFulfillmentStatuses,
				undefined
			);
		}
	}

	// Search fulfillments
	if (_action === 'search' && typeof query === 'string') {
		selectedFulfillmentStatuses = searchParams.getAll(
			'selectedFulfillmentStatuses'
		) as FulfillmentStatus[];

		const searchTerm: string | undefined =
			query.length === 0 ? undefined : query;

		// Loads initial data for external user / vendor employees
		if (typeof user.vendorId === 'string' && user.vendorId.length !== 0) {
			fulfillments = await getFulfillmentsByVendor({
				query: searchTerm,
				vendorId: user.vendorId,
				fulfillmentStatuses:
					selectedFulfillmentStatuses.length === 0
						? undefined
						: selectedFulfillmentStatuses,
			});
		}

		const selectedVendorParam = searchParams.get('selectedVendor');
		const vendorId = selectedVendorParam ? selectedVendorParam : undefined;

		// Search fulfillments as superadmins / Edward Martin employees
		if (user.role === 'SUPERADMIN') {
			fulfillments = await getFulfillments(
				searchTerm,
				selectedFulfillmentStatuses.length === 0
					? undefined
					: selectedFulfillmentStatuses,
				vendorId
			);
		}
	}

	const vendors = user.role !== 'SUPERADMIN' ? null : await getVendors();

	let vendorOptions;
	if (vendors) {
		vendorOptions = createDropdownOptions({
			array: vendors,
			labelKey: 'name',
			valueKey: 'id',
		});
	}

	return json({
		fulfillments,
		fulfillmentStatuses,
		selectedFulfillmentStatuses,
		name,
		orders:
			user.role !== 'SUPERADMIN'
				? null
				: await getOrders(name, selectedOrderStatuses),
		orderStatusDropdownName,
		orderStatusOptions,
		orderStatusDefaults,
		query,
		userRole: user.role,
		vendorOptions,
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
							<Link
								to="new"
								className="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
							>
								Create Order
							</Link>
						</div>
					) : null}
				</div>
			</header>

			<section className="page-section">
				<div className="table-toolbar">
					<Form method="get" replace>
						<div className="input">
							<label>Status</label>
							<DropdownMultiSelect
								name="selectedFulfillmentStatuses"
								options={data.fulfillmentStatuses}
								defaultValue={data.selectedFulfillmentStatuses}
							/>
						</div>

						{data.vendorOptions ? (
							<div>
								<label
									htmlFor="selectedVendor"
									className="block text-sm font-medium leading-6 text-gray-900"
								>
									Vendor
								</label>
								<select
									id="selectedVendor"
									name="selectedVendor"
									className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
								>
									<option value="">Choose a vendor</option>
									{data.vendorOptions.map((option: { value: string, label: string }) => (
											<option
												key={option.value}
												value={option.value}
											>
												{option.label}
											</option>
										))}
								</select>
							</div>
						) : null}


						<div>
							<label htmlFor="query" className="block text-sm font-medium leading-6 text-gray-900">
								Search by name or order number
							</label>

							<div className="mt-2">
								<input
									id="query"
									name="query"
									type="text"
									placeholder="#1234 or Edwina Martinson"
									className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
								/>
							</div>
						</div>

						<button
							className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
							type="submit"
							name="_action"
							value="search"
						>
							Search
						</button>

						<Link className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/20" to="/orders" replace>
							Reset
						</Link>
					</Form>
				</div>

				{data.fulfillments ? (
					<FulFillments data={data} />
				) : (
					<div>No results</div>
				)}
			</section>

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

function FulFillments({ data }) {
	return (
		<table className="min-w-full divide-y divide-gray-300 table-fixed">
			<thead>
				<tr>
					<th scope="col" className="py-3.5 pl-4 pr-3 text-left dark:text-white text-sm font-semibold text-gray-900 sm:pl-0">Order No.</th>
					<th scope="col" className="px-3 py-3.5 text-left dark:text-white text-sm font-semibold text-gray-900">Name</th>
					<th scope="col" className="px-3 py-3.5 text-left dark:text-white text-sm font-semibold text-gray-900">Shipping Address</th>
					<th scope="col" className="px-3 py-3.5 text-left dark:text-white text-sm font-semibold text-gray-900">Tracking Info</th>
					<th scope="col" className="px-3 py-3.5 text-left dark:text-white text-sm font-semibold text-gray-900">Status</th>
					<th scope="col" className="px-3 py-3.5 text-left dark:text-white text-sm font-semibold text-gray-900">Vendor</th>
					<th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0"><span className="sr-only">Edit</span></th>
				</tr>
			</thead>
			<tbody className="divide-y divide-gray-200">
				{data.fulfillments.map((fulfillment) => (
					<tr key={fulfillment.id}>
						<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
							<Link to={`/fulfillments/${fulfillment.id}`}>
								<div>{fulfillment.name}</div>
								<div className="caption">
									{new Date(
										fulfillment.order.createdAt
									).toLocaleString('en-US')}
								</div>
							</Link>
						</td>
						<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
							<Link to={`/fulfillments/${fulfillment.id}`}>
								{fulfillment.order.address.line1}
							</Link>
						</td>
						<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
							<Link to={`/fulfillments/${fulfillment.id}`}>
								<address className="text">
									{fulfillment.order.address.line2 &&
										`${fulfillment.order.address.line2}\n`}
									{fulfillment.order.address.line3 &&
										`${fulfillment.order.address.line3}\n`}
									{fulfillment.order.address.line4 &&
										`${fulfillment.order.address.line4}\n`}
									{fulfillment.order.address.city},{' '}
									{fulfillment.order.address.state}{' '}
									{fulfillment.order.address.postalCode}
								</address>
							</Link>
						</td>
						<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
							<Link to={`/fulfillments/${fulfillment.id}`}>
								{fulfillment.trackingInfo?.number ? (
									<>
										<div>
											{fulfillment.trackingInfo.number}
										</div>
										<div className="caption">
											{fulfillment.trackingInfo.company}
										</div>
									</>
								) : (
									<span className="caption">
										Needs tracking info
									</span>
								)}
							</Link>
						</td>
						<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
							<Link to={`/fulfillments/${fulfillment.id}`}>
								<FulfillmentStatusBadge
									status={fulfillment.status}
								/>
							</Link>
						</td>
						<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
							<Link to={`/fulfillments/${fulfillment.id}`}>
								{fulfillment.vendor?.name}
							</Link>
						</td>
						<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
							<Link to={`/fulfillments/${fulfillment.id}`}>
								Edit
							</Link>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
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

async function getFulfillments(
	query: string | undefined,
	fulfillmentStatuses: FulfillmentStatus[] | undefined,
	vendorId: string | undefined
) {
	return await prisma.fulfillment.findMany({
		where: {
			OR: [
				{
					name: {
						search: query,
					},
				},
				{
					order: {
						address: {
							line1: { search: query },
						},
					},
				},
				{
					order: {
						address: {
							line2: { search: query },
						},
					},
				},
			],
			status: {
				in: fulfillmentStatuses,
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

async function getFulfillmentsByVendor({
	fulfillmentStatuses,
	query,
	vendorId,
}: {
	fulfillmentStatuses: FulfillmentStatus[] | undefined;
	query: string | undefined;
	vendorId: string;
}) {
	return await prisma.fulfillment.findMany({
		where: {
			OR: [
				{
					name: {
						search: query,
					},
				},
				{
					order: {
						address: {
							line1: { search: query },
						},
					},
				},
				{
					order: {
						address: {
							line2: { search: query },
						},
					},
				},
			],
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
