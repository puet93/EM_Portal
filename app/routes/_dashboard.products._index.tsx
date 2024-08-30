import { useEffect, useRef } from 'react';
import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';
import { Button } from '~/components/Buttons';
import { Input, Label } from '~/components/Input';
import DropdownMultiSelect from '~/components/DropdownMultiSelect';

import type { LoaderFunction } from '@remix-run/node';
import type { RefObject, SyntheticEvent } from 'react';

export const loader: LoaderFunction = async ({ request }) => {
	const searchParams = new URL(request.url).searchParams;
	const searchQuery = searchParams.get('query');
	const _action = searchParams.get('_action');

	// 1. Create vendor search filters
	const vendorDropdownName = 'selectedVendorFilters';
	const vendors = await getVendors();
	const vendorOptions = createDropdownOptions({
		array: vendors,
		labelKey: 'name',
		valueKey: 'id',
	});
	const vendorOptionsFiltered = await getVendors([]);
	const vendorOptionsDefaults: string[] = createDropdownDefaultValues(
		vendorOptionsFiltered,
		'id'
	);

	// 2. Query for products
	let results;

	// 2.1 Querying products from initial page visit
	if (!_action) {
		results = await getProducts('', vendorOptionsDefaults);
	}

	// 2.2 Querying products from search form
	if (_action === 'search' && typeof searchQuery === 'string') {
		const selectedVendors = searchParams.getAll(vendorDropdownName);
		results = await getProducts(searchQuery, selectedVendors);
	}

	return json({
		results,
		vendorDropdownName,
		vendorOptions,
		vendorOptionsDefaults,
	});
};

export default function ProductsPage() {
	const data = useLoaderData<typeof loader>();
	const masterCheckboxRef = useRef(null) as RefObject<HTMLInputElement>;
	const tableBodyRef = useRef(null) as RefObject<HTMLTableSectionElement>;

	useEffect(() => {
		if (!masterCheckboxRef.current) return;
		masterCheckboxRef.current.indeterminate = false;
		masterCheckboxRef.current.checked = false;

		const checkboxes = getCheckboxes();
		if (!checkboxes) return;
		for (let i = 0; i < checkboxes.length; i++) {
			checkboxes[i].checked = false;
		}
	}, [data]);

	function getCheckboxes() {
		if (!tableBodyRef.current) return;
		const checkboxes: NodeListOf<HTMLInputElement> =
			tableBodyRef.current.querySelectorAll('input[type="checkbox"]');
		return checkboxes;
	}

	function handleChange() {
		const checkboxes = getCheckboxes();
		if (!checkboxes || !masterCheckboxRef.current) return;

		const count = checkboxes.length;
		let checkedCount = 0;
		for (let i = 0; i < count; i++) {
			if (checkboxes[i].checked) {
				++checkedCount;
			}
		}

		// if no checboxes are checked, set master checkbox checked to false
		if (checkedCount === 0) {
			masterCheckboxRef.current.indeterminate = false;
			masterCheckboxRef.current.checked = false;
			return;
		}

		// if all checkboxes are checked, set master checkbox checked to true
		if (checkedCount / count === 1) {
			masterCheckboxRef.current.indeterminate = false;
			masterCheckboxRef.current.checked = true;
			return;
		}

		// if some checkboxes are checked, set master checkbox indeterminate to true
		if (checkedCount / count !== 1) {
			masterCheckboxRef.current.indeterminate = true;
			return;
		}
	}

	function handleMasterCheckboxChange(e: SyntheticEvent<HTMLInputElement>) {
		const checkboxes = getCheckboxes();
		if (!checkboxes) return;
		for (let i = 0; i < checkboxes.length; i++) {
			if (e.currentTarget.checked) {
				checkboxes[i].checked = true;
			} else {
				checkboxes[i].checked = false;
			}
		}
	}

	return (
		<div className="mx-auto max-w-7xl">
			{/* Page Header */}
			<div className="md:flex md:items-center md:justify-between">
				<div className="min-w-0 flex-1">
					<h1 className="text-4xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:tracking-tight">
						Products
					</h1>
				</div>
				<div className="mt-4 flex flex-shrink-0 md:ml-4 md:mt-0">
					<Button as="link" color="primary" size="lg" to="import">
						Import
					</Button>
				</div>
			</div>

			{/* Table Toolbar */}
			<div className="mt-16">
				<Form method="get" className="flex items-end gap-x-6">
					<div className="shrink grow-0">
						<label className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
							Vendor
						</label>
						<div className="mt-2">
							<DropdownMultiSelect
								name={data.vendorDropdownName}
								options={data.vendorOptions}
								defaultValue={data.vendorOptionsDefaults}
							/>
						</div>
					</div>

					<div className="shrink-0 grow">
						<Label htmlFor="query">Search</Label>

						<div className="mt-2">
							<Input
								id="query"
								name="query"
								type="text"
								placeholder="Search"
								defaultValue={data.query}
							/>
						</div>
					</div>

					<Button
						color="primary"
						type="submit"
						name="_action"
						value="search"
					>
						Search
					</Button>
				</Form>
			</div>

			{data.results ? (
				<div className="mt-8 flow-root">
					<div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
						<div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
							<table className="mt-4 min-w-full table-fixed divide-y divide-gray-300 dark:divide-zinc-700">
								<thead>
									<tr>
										<th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-0">
											Vendor
										</th>
										<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
											Edward Martin
										</th>
										<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
											Item No.
										</th>
										<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
											Cost
										</th>
										<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
											Sample Material No.
										</th>
									</tr>
								</thead>

								<tbody
									ref={tableBodyRef}
									className="divide-y divide-gray-200 dark:divide-zinc-800"
								>
									{data.results.map((product: any) => {
										return (
											<tr key={product.id}>
												<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-0">
													{
														product.vendorProduct
															?.vendor?.name
													}
												</td>
												<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-zinc-300">
													<Link to={product.id}>
														<div>
															{product.title}
														</div>
														<div>{product.sku}</div>
													</Link>
												</td>

												{product.vendorProduct ? (
													<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-zinc-300">
														<div>
															{product
																.vendorProduct
																.itemNo
																? product
																		.vendorProduct
																		.itemNo
																: 'Missing item number'}
														</div>
														<div>
															{product
																.vendorProduct
																.seriesName
																? product
																		.vendorProduct
																		.seriesName
																: 'Missing series'}
														</div>

														<div>
															{product
																.vendorProduct
																.color
																? product
																		.vendorProduct
																		.color
																: 'Missing color'}
														</div>
													</td>
												) : (
													<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-zinc-300">
														<span className="error indicator"></span>{' '}
														MISSING
													</td>
												)}

												{product.vendorProduct
													?.listPrice ? (
													<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-zinc-300">
														{
															product
																.vendorProduct
																.listPrice
														}
													</td>
												) : (
													<td>--</td>
												)}

												{product.vendorProduct
													?.sample ? (
													<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-zinc-300">
														{
															product
																.vendorProduct
																?.sample
																.materialNo
														}
													</td>
												) : (
													<td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-zinc-300">
														<span className="error indicator"></span>{' '}
														MISSING
													</td>
												)}
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

async function getProducts(query: string, vendors: string[]) {
	const include = {
		vendorProduct: {
			include: {
				sample: true,
				vendor: true,
			},
		},
	};

	const products = await prisma.retailerProduct.findMany({
		where: {
			OR: [
				{
					title: { search: query || undefined },
					vendorProduct: {
						vendorId: {
							in:
								vendors && vendors.length > 0
									? vendors
									: undefined,
						},
					},
				},
				{
					vendorProduct: {
						vendorId: {
							in:
								vendors && vendors.length > 0
									? vendors
									: undefined,
						},
						color: { search: query || undefined },
					},
				},
				{
					vendorProduct: {
						vendorId: {
							in:
								vendors && vendors.length > 0
									? vendors
									: undefined,
						},
						seriesName: { search: query || undefined },
					},
				},
			],
		},
		orderBy: [
			{
				vendorProduct: {
					vendor: {
						name: 'asc',
					},
				},
			},
			{ title: 'asc' },
		],
		include,
	});

	return products;
}

async function getVendors(names: string[] | undefined = undefined) {
	if (!names)
		return await prisma.vendor.findMany({ orderBy: { name: 'asc' } });

	const where = { OR: names.map((name) => ({ name: { contains: name } })) };
	return await prisma.vendor.findMany({ where, orderBy: { name: 'asc' } });
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

function createDropdownDefaultValues(array: any[], key: string): string[] {
	return array.map((item) => item[key]);
}

function formatSearchQuery(query: string): string {
	const formattedQuery = query
		.trim()
		.replace(/\s+/g, ' ')
		.replaceAll(' ,', ',');

	formattedQuery
		.replaceAll(', ', ',')
		.replaceAll(',', '|')
		.replaceAll(' ', '&');

	return formattedQuery;
}
