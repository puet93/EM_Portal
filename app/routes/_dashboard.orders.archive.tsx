import { json } from '@remix-run/node';
import {
	Form,
	Link,
	useFetcher,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { FulfillmentStatus } from '@prisma/client';
import { prisma } from '~/db.server';

import { requireSuperAdmin, requireUser } from '~/session.server';
import { fetchTrackingStatus } from '~/utils/fedex.server';
import { toCapitalCase } from '~/utils/helpers';
import {
	Menu,
	MenuButton,
	MenuItem,
	MenuItems,
	Popover,
	PopoverButton,
	PopoverPanel,
} from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid';
import { Button } from '~/components/Buttons';
import MultiSelectMenu from '~/components/MultiSelectMenu';

import type { SyntheticEvent } from 'react';
import type { Option } from '~/components/MultiSelectMenu';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';

export const loader: LoaderFunction = async ({ request }) => {
	const user = await requireUser(request);
	const searchParams = new URL(request.url).searchParams;
	const offset = Number(searchParams.get('offset')) || 0;
	const pageSize = Number(searchParams.get('pageSize')) || 30;
	const search = searchParams.get('search') || '';

	// Create dropdown options from FulfillmentStatus object
	let statusOptions = Object.values(FulfillmentStatus).map((status) => {
		return { value: status, label: toCapitalCase(status) };
	});

	// Create vendor option dropdown if user is a super admin
	let vendorOptions: Option[] = [];
	if (user.role === 'SUPERADMIN') {
		vendorOptions = createDropdownOptions({
			array: await fetchVendors(),
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
	let vendors = searchParams.getAll('vendors');
	if (user.role !== 'SUPERADMIN') {
		where = {
			...where,
			vendorId: user.vendorId,
		};
	} else if (vendors && vendors.length > 0) {
		where = {
			...where,
			vendorId: { in: vendors },
		};
	} else if (searchParams.has('search')) {
		// If search is present but no vendors are selected, query all vendors
		where = {
			...where,
			vendorId: { in: undefined },
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

	if (fulfillments) {
		const trackingNumbers = fulfillments
			.filter((fulfillment) => fulfillment.trackingInfo?.number)
			.map((fulfillment) => fulfillment.trackingInfo.number);

		if (trackingNumbers.length > 0) {
			try {
				const trackingStatuses = await fetchTrackingStatus(
					trackingNumbers
				);
				fulfillments.forEach((fulfillment) => {
					const trackingNumber = fulfillment.trackingInfo?.number;
					if (trackingNumber) {
						fulfillment.trackingInfo.status =
							trackingStatuses[trackingNumber] ||
							'Unknown status';
					}
				});
			} catch (e) {
				console.log('Unable to get tracking numbers');
				console.log(e);
			}
		}
	}

	return json({
		count,
		fulfillments,
		offset,
		pageSize,
		search,
		userRole: user.role,
		statuses,
		statusOptions,
		vendors: user.role === 'SUPERADMIN' ? vendors : null,
		vendorOptions: user.role === 'SUPERADMIN' ? vendorOptions : null,
	});
};

export const action: ActionFunction = async ({ request }) => {
	await requireSuperAdmin(request);

	const formData = await request.formData();
	const _action = formData.get('_action');
	const ids = formData.getAll('fulfillmentIds') as string[];

	switch (_action) {
		case 'complete':
		case 'processing':
		case 'new': {
			const id = formData.get('id');
			if (typeof id !== 'string' || id.length === 0) {
				return json({ error: 'Invalid form data' });
			}
			const status = _action.toUpperCase() as
				| 'COMPLETE'
				| 'PROCESSING'
				| 'NEW';
			const fulfillment = await prisma.fulfillment.update({
				where: { id },
				data: { status },
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
		case 'archiveSelected': {
			const updated = await prisma.fulfillment.updateMany({
				where: {
					id: {
						in: ids,
					},
				},
				data: { isArchived: true },
			});

			return json({ updated });
		}
		case 'markSelectedComplete':
		case 'markSelectedProcessing': {
			const status =
				_action === 'markSelectedComplete' ? 'COMPLETE' : 'PROCESSING';
			const updated = await prisma.fulfillment.updateMany({
				where: { id: { in: ids } },
				data: { status },
			});

			return json({ updated });
		}
		default: {
			return json({ error: 'Invalid form data' });
		}
	}
};

export default function OrdersIndex() {
	const { count, fulfillments, offset, pageSize, ...data } =
		useLoaderData<typeof loader>();
	const [searchParams] = useSearchParams();
	const currentPage = Math.floor(offset / pageSize) + 1;
	const totalPages = Math.ceil(count / pageSize);
	const startIndex = offset + 1;
	const endIndex = Math.min(offset + pageSize, count);

	// data.statuses and data.vendors are search parameters from the loader, not useSearchParams
	const [selectedStatuses, setSelectedStatuses] = useState<Option[]>([]);
	const [selectedVendors, setSelectedVendors] = useState<Option[]>([]);

	useEffect(() => {
		const indices: number[] = data.statuses.map(
			(status: FulfillmentStatus) =>
				data.statusOptions.findIndex(
					(option: Option) => option.value === status
				)
		);
		setSelectedStatuses(indices.map((index) => data.statusOptions[index]));
	}, [data.statuses, data.statusOptions]);

	useEffect(() => {
		if (!data.vendors) {
			console.log('No vendors');
			return;
		}

		if (data.vendorOptions.length === 0) {
			console.log('No vendor options');
			return;
		}

		const indices: number[] = data.vendors.map((vendor: string) =>
			data.vendorOptions.findIndex(
				(option: Option) => option.value === vendor
			)
		);
		setSelectedVendors(indices.map((index) => data.vendorOptions[index]));
	}, [data.vendors, data.vendorOptions]);

	return (
		<>
			{/* Page Header */}
			<div className="md:flex md:items-center md:justify-between">
				<div className="min-w-0 flex-1">
					<h1 className="text-4xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:tracking-tight">
						Orders
					</h1>
				</div>

				{data.userRole === 'SUPERADMIN' ? (
					<div className="mt-4 flex flex-shrink-0 md:ml-4 md:mt-0">
						<Button as="link" color="primary" size="lg" to="new">
							Create Order
						</Button>
					</div>
				) : null}
			</div>

			{/* Tabs */}
			{data.userRole === 'SUPERADMIN' ? (
				<div className="mt-10 border-b border-zinc-700 pb-0 dark:border-white/10">
					<div className="mt-4">
						<div className="block">
							<nav className="-mb-px flex space-x-8">
								<Link
									to=".."
									className="whitespace-nowrap border-b-2 border-transparent px-1 pb-4 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-white"
								>
									Fulfillments
								</Link>

								<Link
									to="../all"
									className="whitespace-nowrap border-b-2 border-transparent px-1 pb-4 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-white"
								>
									Order Admin
								</Link>

								<div
									className="whitespace-nowrap border-b-2 border-sky-500 px-1 pb-4 text-sm font-medium text-sky-600 dark:text-sky-400"
									aria-current="page"
								>
									Archive
								</div>
							</nav>
						</div>
					</div>
				</div>
			) : null}

			{/* Search */}
			<Form
				id="search"
				method="get"
				className="mt-12 flex items-end gap-x-4"
			>
				<div className="grow basis-2/5">
					<label
						htmlFor="search"
						className="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
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
							className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:placeholder:text-zinc-400 dark:focus:ring-indigo-500 sm:text-sm sm:leading-6"
						/>
					</div>
				</div>

				<div className="basis-1/5">
					<MultiSelectMenu
						name="statuses"
						label="Statuses"
						options={data.statusOptions}
						selectedOptions={selectedStatuses}
						setSelectedOptions={setSelectedStatuses}
					/>
				</div>

				{data.vendorOptions && data.vendorOptions.length > 0 ? (
					<div className="basis-1/5">
						<MultiSelectMenu
							name="vendors"
							label="Vendors"
							options={data.vendorOptions}
							selectedOptions={selectedVendors}
							setSelectedOptions={setSelectedVendors}
						/>
					</div>
				) : null}

				<div className="flex basis-1/5 gap-x-4">
					<Button color="primary" type="submit" fullWidth>
						Search
					</Button>

					<Button as="link" to="/orders" replace>
						Reset
					</Button>
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
									? 'relative z-10 inline-flex items-center bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-zinc-950'
									: 'relative inline-flex items-center px-4 py-2 text-sm font-semibold dark:bg-white/10 dark:hover:bg-white/20 text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:text-white dark:ring-0';

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

							// Vendors
							if (searchParams.has('vendors')) {
								searchParams.getAll('vendors').map((vendor) => {
									searchParamsString =
										searchParamsString +
										`&vendors=${vendor}`;
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
					<FulFillments
						fulfillments={fulfillments}
						userRole={data.userRole}
					/>
				) : (
					<div>No results</div>
				)}
			</section>
		</>
	);
}

function CopyButton({ text }: { text: string }) {
	const [copySuccess, setCopySuccess] = useState('');

	const copyToClipboard = async (
		event: SyntheticEvent<HTMLButtonElement>
	) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopySuccess('Copied!');

			// Reset the state after 1 second
			setTimeout(() => {
				setCopySuccess('');
			}, 1000);
		} catch (err) {
			setCopySuccess('Failed to copy!');

			// Reset the state after 1 second
			setTimeout(() => {
				setCopySuccess('');
			}, 1000);
		}
	};

	return (
		<div className="flex flex-col items-center">
			<Popover className="relative">
				<PopoverButton
					as="button"
					onClick={copyToClipboard}
					className="rounded-full bg-transparent p-1.5 font-bold text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none dark:text-zinc-700 dark:hover:bg-zinc-950 dark:hover:text-white"
					aria-label="Copy to clipboard"
				>
					<svg
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={1.5}
						stroke="currentColor"
						className="h-5 w-5"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
						/>
					</svg>
				</PopoverButton>
				{copySuccess && (
					<PopoverPanel
						static
						className="absolute -left-1/2 bottom-10 z-10 mt-2 rounded-md bg-black px-3 py-2 text-center text-xs text-white"
					>
						{copySuccess}
					</PopoverPanel>
				)}
			</Popover>
		</div>
	);
}

function FulfillmentActions({ id, name }: { id: string; name: string }) {
	let fetcher = useFetcher();

	return (
		<fetcher.Form method="post">
			<input name="id" value={id} type="hidden" />
			<Menu as="div" className="relative flex-none">
				<MenuButton className="-m-2.5 block p-2.5 text-gray-500 transition-colors hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white">
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
				' bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10 inline-flex items-center rounded-md dark:bg-red-400/10 px-2 py-1 text-xs font-medium dark:text-red-400 dark:ring-red-400/20';
			break;
		case 'PROCESSING':
			className =
				'inline-flex items-center rounded-md bg-yellow-50 dark:bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-800 dark:text-yellow-500 dark:ring-yellow-400/20 ring-1 ring-inset ring-yellow-600/20';
			break;
		case 'COMPLETE':
			className =
				'bg-green-50 text-green-700 ring-green-600/20 inline-flex items-center rounded-md dark:bg-green-500/10 px-2 py-1 text-xs font-medium dark:text-green-400 ring-1 ring-inset dark:ring-green-500/20';
			break;
		case 'NEW':
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
	userRole,
	fulfillments,
}: {
	userRole: 'SUPERADMIN' | 'ADMIN' | 'USER';
	fulfillments: any[];
}) {
	const selectAllRef = useRef<HTMLInputElement>(null);
	const [isShowingActionButtons, setIsShowingActionButtons] = useState(false);

	const handleCheckboxChange = () => {
		// Find all checkboxes with name="fulfillmentIds"
		const allCheckboxes = document.querySelectorAll<HTMLInputElement>(
			'input[name="fulfillmentIds"]'
		);

		// Determine how many checkboxes are selected
		let selectedCount = 0;
		allCheckboxes.forEach((checkbox) => {
			if (checkbox.checked) selectedCount++;
		});

		// Set the select all checkbox to indeterminate or checked based on the state of individual checkboxes
		if (selectAllRef.current) {
			selectAllRef.current.indeterminate =
				selectedCount > 0 && selectedCount < allCheckboxes.length;
			selectAllRef.current.checked =
				selectedCount === allCheckboxes.length;
		}

		// Show or hide action buttons based on selection
		setIsShowingActionButtons(selectedCount > 0);
	};

	const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
		const isChecked = e.target.checked;

		const allCheckboxes = document.querySelectorAll<HTMLInputElement>(
			'input[name="fulfillmentIds"]'
		);
		allCheckboxes.forEach((checkbox) => {
			checkbox.checked = isChecked;
		});

		setIsShowingActionButtons(isChecked);
	};

	function openPickTickets() {
		const selectedCheckboxes = document.querySelectorAll(
			'input[name="fulfillmentIds"]:checked'
		);
		const selectedIds = Array.from(selectedCheckboxes).map(
			(checkbox) => checkbox.value
		);

		if (selectedIds.length === 0) {
			alert('Please select at least one order.');
			return;
		}

		const url = new URL('/orders/pick-tickets', window.location.origin);
		selectedIds.forEach((id) => url.searchParams.append('ids', id));

		window.open(url.toString(), '_blank');
	}

	return (
		<Form method="post">
			<table className="min-w-full divide-y divide-gray-300 dark:divide-zinc-700">
				<thead>
					<tr>
						<th className="relative px-7 sm:w-12 sm:px-6">
							<input
								type="checkbox"
								className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-600"
								onChange={handleSelectAll}
								ref={selectAllRef}
							/>
						</th>

						<th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-0">
							{isShowingActionButtons ? (
								<div className="flex gap-x-3">
									<Button
										color="primary"
										size="xs"
										name="_action"
										value="createPickTickets"
										onClick={openPickTickets}
									>
										Print Tickets
									</Button>

									{userRole === 'SUPERADMIN' ? (
										<>
											<Button
												size="xs"
												type="submit"
												name="_action"
												value="markSelectedProcessing"
											>
												Processing
											</Button>

											<Button
												size="xs"
												type="submit"
												name="_action"
												value="markSelectedComplete"
											>
												Complete
											</Button>

											<Button
												size="xs"
												type="submit"
												name="_action"
												value="archiveSelected"
											>
												Archive
											</Button>
										</>
									) : null}
								</div>
							) : (
								'Order No.'
							)}
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
							className="relative py-3.5 pl-3 pr-4 sm:pr-0"
						>
							<span className="sr-only">Actions</span>
						</th>
					</tr>
				</thead>

				<tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
					{fulfillments.map((fulfillment) => (
						<tr key={fulfillment.id}>
							<th className="relative px-7 sm:w-12 sm:px-6">
								<input
									type="checkbox"
									name="fulfillmentIds"
									value={fulfillment.id}
									className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-600"
									onChange={handleCheckboxChange}
								/>
							</th>

							<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">
								<Link to={`/fulfillments/${fulfillment.id}`}>
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
								<Link to={`/fulfillments/${fulfillment.id}`}>
									<address className="not-italic">
										<span className="block leading-6 text-gray-900 dark:text-white">
											{fulfillment.order.address.line1}
										</span>

										<span className="leading-5 text-gray-500 dark:text-zinc-300">
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
										</span>
									</address>
								</Link>
							</td>

							<td className="whitespace-nowrap px-3 py-4 text-sm leading-5">
								{fulfillment.trackingInfo?.number ? (
									<div className="flex items-center gap-x-4">
										<div>
											<div className="flex items-start gap-x-3">
												<p className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
													{
														fulfillment.trackingInfo
															.number
													}
												</p>

												{/* {fulfillment.trackingInfo
													.status === 'Delivered' ? (
													<p className="mt-0.5 whitespace-nowrap rounded-md bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
														{
															fulfillment
																.trackingInfo
																.status
														}
													</p>
												) : (
													<p className="mt-0.5 whitespace-nowrap rounded-md bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
														{
															fulfillment
																.trackingInfo
																.status
														}
													</p>
												)} */}
											</div>

											<div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500  dark:text-zinc-400">
												<p className="whitespace-nowrap">
													{
														fulfillment.trackingInfo
															.company
													}
												</p>
												<svg
													viewBox="0 0 2 2"
													className="h-0.5 w-0.5 fill-current"
												>
													<circle
														r={1}
														cx={1}
														cy={1}
													/>
												</svg>
												<p className="truncate">
													{
														fulfillment.trackingInfo
															.status
													}
												</p>
											</div>
										</div>

										<CopyButton
											text={
												fulfillment.trackingInfo.number
											}
										/>
									</div>
								) : (
									<Link
										to={`/fulfillments/${fulfillment.id}`}
									>
										<span className="italic text-indigo-600 transition-colors hover:text-indigo-900 dark:text-zinc-500 dark:hover:text-white">
											Needs tracking info
										</span>
									</Link>
								)}
							</td>

							<td className="whitespace-nowrap px-3 py-4">
								<Link to={`/fulfillments/${fulfillment.id}`}>
									<FulfillmentStatusBadge
										status={fulfillment.status}
									/>
								</Link>
							</td>

							<td className="py-4 pl-3 pr-4 sm:pr-0">
								<div className="flex items-center justify-end gap-x-4">
									<Button
										as="link"
										to={`/fulfillments/${fulfillment.id}`}
										size="sm"
									>
										View
										<span className="sr-only">
											, {fulfillment.name}
										</span>
									</Button>

									<FulfillmentActions
										id={fulfillment.id}
										name={fulfillment.name}
									/>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</Form>
	);
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

async function fetchVendors() {
	return prisma.vendor.findMany();
}
