import { json } from '@remix-run/node';
import { Form, Link, useFetcher, useLoaderData } from '@remix-run/react';
import { FulfillmentStatus, OrderStatus } from '@prisma/client';
import { prisma } from '~/db.server';
import { EditIcon, TrashIcon } from '~/components/Icons';
import Input from '~/components/Input';
import { requireUser } from '~/session.server';
import { toCapitalCase } from '~/utils/helpers';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import DropdownMultiSelect from '~/components/DropdownMultiSelect';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid';

export const loader: LoaderFunction = async ({ request }) => {
	const user = await requireUser(request);
	const searchParams = new URL(request.url).searchParams;
	const _action = searchParams.get('_action');
	const query = searchParams.get('query');

	const page = Number(searchParams.get('page')) || 1;
	const pageSize = Number(searchParams.get('pageSize')) || 50;

	// Create dropdown options from FulfillmentStatus object
	const fulfillmentStatuses = Object.values(FulfillmentStatus).map(
		(status) => {
			return { value: status, label: toCapitalCase(status) };
		}
	);

	// Set default values
	let selectedFulfillmentStatuses: FulfillmentStatus[] = ['NEW'];

	let fulfillments;

	// Loads initial data
	if (_action !== 'search') {
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
		query,
		userRole: user.role,
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

export default function OrderIndex() {
	const data = useLoaderData<typeof loader>();

	return (
		<>
			{/* Page Header */}
			<header className="page-header">
				<div className="page-header__row">
					<h1 className="text-4xl font-bold">Orders</h1>
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

			{/* Tabs */}
			{data.userRole === 'SUPERADMIN' ? (
				<div className="border-b border-zinc-700 pb-0">
					<div className="mt-4">
						<div className="block">
							<nav className="-mb-px flex space-x-8">
								{/* Current: "border-indigo-500 text-indigo-600" */}
								{/* Default: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700" */}
								<div
									className="whitespace-nowrap border-b-2 border-indigo-300 px-1 pb-4 text-sm font-medium text-indigo-300"
									aria-current="page"
								>
									Fulfillments
								</div>
								<Link
									to="all"
									className="whitespace-nowrap border-b-2 border-transparent px-1 pb-4 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-white"
								>
									Order Admin
								</Link>
							</nav>
						</div>
					</div>
				</div>
			) : null}

			{/* Fulfillment Table Header */}
			<Form
				method="get"
				replace
				className="flex flex-wrap items-end gap-x-6"
			>
				<div className="w-full">
					<div className="input">
						<label>Status</label>
						<DropdownMultiSelect
							name="selectedFulfillmentStatuses"
							options={data.fulfillmentStatuses}
							defaultValue={data.selectedFulfillmentStatuses}
						/>
					</div>
				</div>

				<div className="grow">
					<label
						htmlFor="query"
						className="block text-sm font-medium leading-6 text-white"
					>
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

				{data.vendorOptions ? (
					<div>
						<label
							htmlFor="selectedVendor"
							className="block text-sm font-medium leading-6 text-white"
						>
							Vendor
						</label>
						<select
							id="selectedVendor"
							name="selectedVendor"
							className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
						>
							<option value="">Choose a vendor</option>
							{data.vendorOptions.map(
								(option: { value: string; label: string }) => (
									<option
										key={option.value}
										value={option.value}
									>
										{option.label}
									</option>
								)
							)}
						</select>
					</div>
				) : null}

				<div className="flex shrink-0 gap-x-4">
					<button
						className="flex-grow rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
						type="submit"
						name="_action"
						value="search"
					>
						Search
					</button>

					<Link
						className="rounded-md bg-white/10 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-white/20"
						to="/orders"
						replace
					>
						Reset
					</Link>
				</div>
			</Form>

			{/* Fulfillments */}
			<section className="page-section">
				{data.fulfillments ? (
					<FulFillments data={data} />
				) : (
					<div>No results</div>
				)}
			</section>
		</>
	);
}

function FulfillmentActions({ id, name }: { id: string; name: string }) {
	let fetcher = useFetcher();
	// let isSubmitting = fetcher.state === 'submitting';

	return (
		<fetcher.Form method="post">
			<input name="id" value={id} type="hidden" />
			<Menu as="div" className="relative flex-none">
				<MenuButton className="-m-2.5 block p-2.5 text-zinc-400 transition-colors hover:text-white">
					<span className="sr-only">Open options</span>
					<EllipsisVerticalIcon
						aria-hidden="true"
						className="h-5 w-5"
					/>
				</MenuButton>
				<MenuItems
					transition
					className="absolute right-0 z-10 mt-3 w-40 origin-top-right rounded-md bg-zinc-950 py-2 shadow-lg ring-1 ring-zinc-900/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
				>
					<MenuItem>
						<button
							name="_action"
							value="new"
							type="submit"
							className="w-full px-3 py-1 text-left text-sm leading-6 text-white data-[focus]:bg-zinc-800"
						>
							Mark <span className="sr-only">{name} </span>as new
						</button>
					</MenuItem>
					<MenuItem>
						<button
							name="_action"
							value="processing"
							type="submit"
							className="w-full px-3 py-1 text-left text-sm leading-6 text-white data-[focus]:bg-zinc-800"
						>
							Mark <span className="sr-only">{name} </span>as
							processing
						</button>
					</MenuItem>
					<MenuItem>
						<button
							name="_action"
							value="complete"
							type="submit"
							className="w-full px-3 py-1 text-left text-sm leading-6 text-white data-[focus]:bg-zinc-800"
						>
							Mark <span className="sr-only">{name} </span>as
							complete
						</button>
					</MenuItem>
					{/* <MenuItem>
						<button
							type="button"
							className="w-full px-3 py-1 text-left text-sm leading-6 text-gray-900 data-[focus]:bg-gray-200"
						>
							Delete
							<span className="sr-only">, {name}</span>
						</button>
					</MenuItem> */}
				</MenuItems>
			</Menu>
		</fetcher.Form>
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
		<table className="min-w-full table-fixed divide-y divide-zinc-700">
			<thead>
				<tr>
					<th
						scope="col"
						className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-0"
					>
						Order No.
					</th>
					<th
						scope="col"
						className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
					>
						Ship to
					</th>
					<th
						scope="col"
						className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
					>
						Tracking Info
					</th>
					<th
						scope="col"
						className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
					>
						Status
					</th>
					<th
						scope="col"
						className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
					>
						Vendor
					</th>
					<th
						scope="col"
						className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
					>
						<span className="sr-only">View order</span>
					</th>
					<th
						scope="col"
						className="relative py-3.5 pl-3 pr-4 sm:pr-0"
					>
						<span className="sr-only">Edit</span>
					</th>
				</tr>
			</thead>
			<tbody className="divide-y divide-zinc-800">
				{data.fulfillments.map((fulfillment) => (
					<tr key={fulfillment.id}>
						<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">
							<Link to={`/fulfillments/${fulfillment.id}`}>
								<div className="text-sm font-bold text-gray-900 dark:text-white">
									{fulfillment.name}
								</div>
								<div className="mt-1 text-xs font-normal text-gray-500 dark:text-zinc-400">
									{new Date(
										fulfillment.order.createdAt
									).toLocaleString('en-US')}
								</div>
							</Link>
						</td>
						<td className="whitespace-nowrap px-3 py-4 text-sm">
							<Link to={`/fulfillments/${fulfillment.id}`}>
								<address className="not-italic">
									<span className="block leading-6 text-gray-900 dark:text-white">
										{fulfillment.order.address.line1}
									</span>

									<span className="leading-5 text-zinc-400">
										{fulfillment.order.address.line2 &&
											`${fulfillment.order.address.line2}\n`}
										{fulfillment.order.address.line3 &&
											`${fulfillment.order.address.line3}\n`}
										{fulfillment.order.address.line4 &&
											`${fulfillment.order.address.line4}\n`}
										{fulfillment.order.address.city},{' '}
										{fulfillment.order.address.state}{' '}
										{fulfillment.order.address.postalCode}
									</span>
								</address>
							</Link>
						</td>
						<td className="whitespace-nowrap px-3 py-4 text-sm leading-5">
							<Link to={`/fulfillments/${fulfillment.id}`}>
								{fulfillment.trackingInfo?.number ? (
									<>
										<div className="text-zinc-400">
											{fulfillment.trackingInfo.number}
										</div>
										<div className="text-zinc-400">
											{fulfillment.trackingInfo.company}
										</div>
									</>
								) : (
									<span className="italic text-zinc-600 transition-colors hover:text-white">
										Needs tracking info
									</span>
								)}
							</Link>
						</td>
						<td className="whitespace-nowrap px-3 py-4">
							<Link to={`/fulfillments/${fulfillment.id}`}>
								<FulfillmentStatusBadge
									status={fulfillment.status}
								/>
							</Link>
						</td>
						<td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-400">
							<Link to={`/fulfillments/${fulfillment.id}`}>
								{fulfillment.vendor?.name}
							</Link>
						</td>
						<td>
							<Link
								to={`/fulfillments/${fulfillment.id}`}
								className="rounded bg-white/10 px-2 py-1 text-xs font-medium text-gray-900 shadow-sm hover:bg-white/20 dark:text-white"
							>
								View
								<span className="sr-only">
									, {fulfillment.name}
								</span>
							</Link>
						</td>
						<td className="py-5 pl-3 pr-0 sm:pr-0">
							<FulfillmentActions
								id={fulfillment.id}
								name={fulfillment.name}
							/>
						</td>
					</tr>
				))}
			</tbody>
		</table>
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
				createdAt: 'asc',
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
				createdAt: 'asc',
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
