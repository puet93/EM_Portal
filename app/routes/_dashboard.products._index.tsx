import type { LoaderFunction } from '@remix-run/node';
import type { RefObject, SyntheticEvent } from 'react';
import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { useEffect, useRef } from 'react';
import DropdownMultiSelect from '~/components/DropdownMultiSelect';
import { SearchIcon } from '~/components/Icons';
import { prisma } from '~/db.server';

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
	const vendorOptionsFiltered = await getVendors([
		'Florim',
		'European Porcelain Ceramics',
	]);
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
		<>
			<header className="page-header">
				<div className="page-header__row">
					<h1>Products</h1>
					<div className="page-header__actions">
						<Link className="button" to="import">
							Import
						</Link>
					</div>
				</div>
			</header>

			<div className="table-toolbar">
				<Form method="get">
					<div className="input">
						<label>Vendor</label>
						<DropdownMultiSelect
							name={data.vendorDropdownName}
							options={data.vendorOptions}
							defaultValue={data.vendorOptionsDefaults}
						/>
					</div>

					<div className="search-bar">
						<SearchIcon className="search-icon" id="search-icon" />
						<input
							className="search-input"
							aria-labelledby="search-icon"
							type="search"
							name="query"
							id="query"
							placeholder="Search"
							defaultValue={data.query}
						/>
						<button
							className="primary button"
							type="submit"
							name="_action"
							value="search"
						>
							Search
						</button>
					</div>
				</Form>
			</div>

			{data.results ? (
				<>
					<div className="message">
						{data.results.length} products found
					</div>

					<table style={{ marginTop: '36px' }}>
						<thead>
							<tr>
								<th>Vendor</th>
								<th>Edward Martin</th>
								<th>Item No.</th>
								<th>Cost</th>
								<th>Sample Material No.</th>
							</tr>
						</thead>

						<tbody ref={tableBodyRef}>
							{data.results.map((product: any) => {
								return (
									<tr key={product.id}>
										<td>
											{
												product.vendorProduct?.vendor
													?.name
											}
										</td>
										<td>
											<Link to={product.id}>
												<div>{product.title}</div>
												<div>{product.sku}</div>
											</Link>
										</td>

										{product.vendorProduct ? (
											<td>
												<div>
													{product.vendorProduct
														.itemNo
														? product.vendorProduct
																.itemNo
														: 'Missing item number'}
												</div>
												<div>
													{product.vendorProduct
														.seriesName
														? product.vendorProduct
																.seriesName
														: 'Missing series'}
												</div>

												<div>
													{product.vendorProduct.color
														? product.vendorProduct
																.color
														: 'Missing color'}
												</div>
											</td>
										) : (
											<td>
												<span className="error indicator"></span>{' '}
												MISSING
											</td>
										)}

										{product.vendorProduct?.listPrice ? (
											<td>
												{
													product.vendorProduct
														.listPrice
												}
											</td>
										) : (
											<td>--</td>
										)}

										{product.vendorProduct?.sample ? (
											<td>
												{
													product.vendorProduct
														?.sample.materialNo
												}
											</td>
										) : (
											<td>
												<span className="error indicator"></span>{' '}
												MISSING
											</td>
										)}
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

async function getProducts(query: string, vendors: string[]) {
	const formattedQuery = formatSearchQuery(query);
	const title = formattedQuery ? { search: formattedQuery } : undefined;
	const include = {
		vendorProduct: {
			include: {
				sample: true,
				vendor: true,
			},
		},
	};
	const vendor =
		vendors.length !== 0
			? {
					id: { in: vendors },
			  }
			: undefined;

	return await prisma.retailerProduct.findMany({
		where: {
			title,
			vendorProduct: { vendor },
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
