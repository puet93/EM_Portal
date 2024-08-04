import { json } from '@remix-run/node';
import {
	Form,
	Link,
	useFetcher,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react';
import { FulfillmentStatus } from '@prisma/client';
import { prisma } from '~/db.server';
import { requireUser } from '~/session.server';
import { toCapitalCase } from '~/utils/helpers';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid';
import DropdownMultiSelect from '~/components/DropdownMultiSelect';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
// import type { Prisma } from '@prisma/client';

export const loader: LoaderFunction = async ({ request }) => {
	const user = await requireUser(request);
	const searchParams = new URL(request.url).searchParams;
	const offset = Number(searchParams.get('offset')) || 0;
	const pageSize = Number(searchParams.get('pageSize')) || 50;
	const search = searchParams.get('search') || '';

	// Create dropdown options from FulfillmentStatus object
	const statusOptions = Object.values(FulfillmentStatus).map((status) => {
		return { value: status, label: toCapitalCase(status) };
	});

	// Create vendor option dropdown if user is a super admin
	const vendors = user.role !== 'SUPERADMIN' ? null : await getVendors();
	let vendorOptions;
	if (vendors) {
		vendorOptions = createDropdownOptions({
			array: vendors,
			labelKey: 'name',
			valueKey: 'id',
		});
	}

	// Search
	let where = search
		? {
				OR: [
					{
						name: {
							search,
						},
					},
					{
						order: {
							address: {
								line1: { search },
							},
						},
					},
					{
						order: {
							address: {
								line2: { search },
							},
						},
					},
				],
		  }
		: {};

	// Statuses
	let statuses = searchParams.getAll('statuses') as FulfillmentStatus[];
	if (statuses && statuses.length > 0) {
		where = {
			...where,
			status: { in: statuses },
		};
	} else if (searchParams.has('search')) {
		// If search is present but no statuses are selected, query all statuses
		where = {
			...where,
			status: { in: undefined },
		};
	} else {
		// Default to loading "NEW" fulfillments for the initial load
		statuses = ['NEW'];
		where = {
			...where,
			status: { in: statuses },
		};
	}

	// Vendors
	if (user.role !== 'SUPERADMIN') {
		where = {
			...where,
			vendorId: user.vendorId,
		};
	}

	const [fulfillments, count] = await prisma.$transaction([
		prisma.fulfillment.findMany({
			where,
			skip: offset,
			take: pageSize,
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
		}),
		prisma.fulfillment.count({ where }),
	]);

	return json({
		count,
		fulfillments,
		offset,
		pageSize,
		search,
		userRole: user.role,
		statuses,
		statusOptions,
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
	const { count, fulfillments, offset, pageSize, ...data } =
		useLoaderData<typeof loader>();
	const [searchParams] = useSearchParams();
	const currentPage = Math.floor(offset / pageSize) + 1;
	const totalPages = Math.ceil(count / pageSize);
	const startIndex = offset + 1;
	const endIndex = Math.min(offset + pageSize, count);

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
				id="search"
				method="get"
				className="flex flex-wrap items-end gap-x-6"
			>
				<div className="w-full">
					<div className="input">
						<label>Status</label>
						<DropdownMultiSelect
							name="statuses"
							options={data.statusOptions}
							defaultValue={data.statuses}
						/>
					</div>
				</div>

				<div className="grow">
					<label
						htmlFor="search"
						className="block text-sm font-medium leading-6 text-white"
					>
						Search by name or order number
					</label>

					<div className="mt-2">
						<input
							id="search"
							name="search"
							type="text"
							placeholder="#1234 or Edwina Martinson"
							defaultValue={data.search}
							className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
						/>
					</div>
				</div>

				{data.vendorOptions ? (
					<div>
						<label
							htmlFor="vendors"
							className="block text-sm font-medium leading-6 text-white"
						>
							Vendor
						</label>
						<select
							id="vendors"
							name="vendors"
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
						className="flex-grow rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
						type="submit"
					>
						Search
					</button>

					{/* light: "rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50" */}
					{/* dark:  "rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/20" */}

					<Link
						className="rounded-md bg-indigo-50 px-3 py-2 text-center text-sm font-semibold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-100 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
						to="/orders"
						replace
					>
						Reset
					</Link>
				</div>
			</Form>

			{/* Fulfillments */}
			<section className="page-section">
				{/* Pagination */}
				<div className="flex items-center justify-between py-4">
					{count !== 0 ? (
						<p className="text-sm text-gray-700 dark:text-zinc-300">
							Showing{' '}
							<span className="font-medium">{startIndex}</span> to{' '}
							<span className="font-medium">{endIndex}</span> of{' '}
							<span className="font-medium">{count}</span> results
						</p>
					) : null}

					<nav
						className="isolate inline-flex -space-x-px rounded-md shadow-sm"
						aria-label="Pagination"
					>
						{Array.from(
							{ length: totalPages },
							(_, i) => i + 1
						).map((page) => {
							// Style based on current page
							const className =
								page === currentPage
									? 'relative z-10 inline-flex items-center bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
									: 'relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-zinc-950 focus:z-20 focus:outline-offset-0 dark:text-white';

							// Create search params string
							let searchParamsString = '';

							// Offset and page size
							searchParamsString =
								searchParamsString +
								`?offset=${(page - 1) * pageSize}` +
								`&pageSize=${pageSize}`;

							// Search
							if (searchParams.has('search')) {
								searchParamsString =
									searchParamsString +
									`&search=${searchParams.get('search')}`;
							}

							// Statuses
							if (searchParams.has('statuses')) {
								searchParams
									.getAll('statuses')
									.map((status) => {
										searchParamsString =
											searchParamsString +
											`&statuses=${status}`;
									});
							}

							return (
								<Link
									aria-current={
										page === currentPage ? 'page' : false
									}
									className={className}
									key={page}
									to={searchParamsString}
								>
									{page}
								</Link>
							);
						})}
					</nav>
				</div>

				{fulfillments && fulfillments.length !== 0 ? (
					<FulFillments fulfillments={fulfillments} count={count} />
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

function FulfillmentStatusBadge({ status }: { status: FulfillmentStatus }) {
	let className;
	switch (status) {
		case 'ERROR':
		case 'CANCELLED':
			className =
				'inline-flex items-center rounded-md bg-red-400/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-400/20';
			break;
		case 'PROCESSING':
			// LGHT: "inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20"
			// DARK: "inline-flex items-center rounded-md bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-500 ring-1 ring-inset ring-yellow-400/20"
			className =
				'inline-flex items-center rounded-md bg-yellow-50 dark:bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-800 dark:text-yellow-500 dark:ring-yellow-400/20 ring-1 ring-inset ring-yellow-600/20';
			break;
		case 'COMPLETE':
			className =
				'inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20';
			break;
		case 'NEW':
			// LGHT: inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10
			// DARK: inline-flex items-center rounded-md bg-blue-400/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-400/30
			className =
				'inline-flex items-center rounded-md bg-blue-50 text-blue-700 ring-blue-700/10 dark:bg-blue-400/10 px-2 py-1 text-xs font-medium dark:text-blue-400 ring-1 ring-inset dark:ring-blue-400/30';
			break;
		default:
			className =
				'inline-flex items-center rounded-md bg-gray-400/10 px-2 py-1 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-400/20';
	}

	return <span className={className}>{toCapitalCase(status)}</span>;
}

function FulFillments({
	fulfillments,
	count,
}: {
	fulfillments: any;
	count: number;
}) {
	return (
		<>
			<div className="container mx-auto">
				<table className="min-w-full table-fixed divide-y divide-gray-300 dark:divide-zinc-700">
					<thead>
						<tr>
							<th
								scope="col"
								className="w-1/6 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-0"
							>
								Order No.
							</th>
							<th
								scope="col"
								className="w-1/6 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
							>
								Ship to
							</th>
							<th
								scope="col"
								className="w-1/6 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
							>
								Tracking Info
							</th>
							<th
								scope="col"
								className="w-1/6 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
							>
								Status
							</th>
							<th
								scope="col"
								className="w-1/6 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
							>
								<span className="sr-only">View order</span>
							</th>
							<th
								scope="col"
								className="relative w-1/6 py-3.5 pl-3 pr-4 sm:pr-0"
							>
								<span className="sr-only">Edit</span>
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
						{fulfillments.map((fulfillment) => (
							<tr key={fulfillment.id}>
								<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">
									<Link
										to={`/fulfillments/${fulfillment.id}`}
									>
										<div className="text-sm font-bold text-gray-900 dark:text-white">
											{fulfillment.name}
										</div>
										<div className="mt-1 text-xs font-normal text-gray-500 dark:text-zinc-300">
											{new Date(
												fulfillment.order.createdAt
											).toLocaleString('en-US')}
										</div>

										<div className="mt-1 text-xs font-normal text-gray-500 dark:text-zinc-300">
											{fulfillment.vendor?.name}
										</div>
									</Link>
								</td>
								<td className="whitespace-nowrap px-3 py-4 text-sm">
									<Link
										to={`/fulfillments/${fulfillment.id}`}
									>
										<address className="not-italic">
											<span className="block leading-6 text-gray-900 dark:text-white">
												{
													fulfillment.order.address
														.line1
												}
											</span>

											<span className="leading-5 text-gray-500 dark:text-zinc-300">
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
											</span>
										</address>
									</Link>
								</td>
								<td className="whitespace-nowrap px-3 py-4 text-sm leading-5">
									<Link
										to={`/fulfillments/${fulfillment.id}`}
									>
										{fulfillment.trackingInfo?.number ? (
											<>
												<div className="text-gray-500 dark:text-zinc-300">
													{
														fulfillment.trackingInfo
															.number
													}
												</div>
												<div className="text-gray-500 dark:text-zinc-300">
													{
														fulfillment.trackingInfo
															.company
													}
												</div>
											</>
										) : (
											<span className="italic text-indigo-600 transition-colors hover:text-indigo-900 dark:text-zinc-500 dark:hover:text-white">
												Needs tracking info
											</span>
										)}
									</Link>
								</td>
								<td className="whitespace-nowrap px-3 py-4">
									<Link
										to={`/fulfillments/${fulfillment.id}`}
									>
										<FulfillmentStatusBadge
											status={fulfillment.status}
										/>
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
			</div>

			{/* {data.count !== 0 ? (
				<>
					<input
						form="search"
						name="page"
						type="hidden"
						value={data.page}
					/>
					<button
						form="search"
						name="_action"
						value="paginate"
						className="flex w-full items-center justify-center rounded-md bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-100 focus-visible:outline-offset-0 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
					>
						Load More...
					</button>
				</>
			) : null} */}
		</>
	);
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
