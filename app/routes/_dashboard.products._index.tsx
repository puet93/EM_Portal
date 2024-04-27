import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import type { RefObject, SyntheticEvent } from 'react';
import { useEffect, useRef } from 'react';
import { SearchIcon } from '~/components/Icons';
import { prisma } from '~/db.server';

export const loader: LoaderFunction = async ({ request }) => {
	const searchParams = new URL(request.url).searchParams;
	const searchQuery = searchParams.get('query');

	if (typeof searchQuery !== 'string' || searchQuery.length === 0) {
		return json({ results: null });
	}

	try {
		const formattedQuery = searchQuery
			.trim()
			.replace(/\s+/g, ' ')
			.replaceAll(' ,', ',');

		const query = formattedQuery
			.replaceAll(', ', ',')
			.replaceAll(',', '|')
			.replaceAll(' ', '&');

		const transactions = await prisma.$transaction([
			prisma.retailerProduct.findMany({
				where: {
					vendorProduct: {
						sample: {
							materialNo: query,
						},
					},
				},
				include: {
					vendorProduct: {
						include: {
							sample: true,
						},
					},
				},
			}),
			prisma.retailerProduct.findMany({
				where: {
					sku: {
						search: query,
					},
				},
				include: {
					vendorProduct: {
						include: {
							sample: true,
						},
					},
				},
			}),
			prisma.retailerProduct.findMany({
				where: {
					vendorProduct: {
						itemNo: {
							search: query,
						},
					},
				},
				include: {
					vendorProduct: {
						include: {
							sample: true,
						},
					},
				},
			}),
			prisma.retailerProduct.findMany({
				where: {
					title: {
						search: query,
					},
				},
				include: {
					vendorProduct: {
						include: {
							sample: true,
						},
					},
				},
			}),
		]);

		const results = [];
		for (let i = 0; i < transactions.length; i++) {
			results.push(...transactions[i]);
		}

		if (results.length === 0) {
			return json({ results: null });
		}

		return json({
			queries: { originalQuery: searchQuery, formattedQuery, query },
			results,
		});
	} catch (e) {
		return json({ error: e, results: [] });
	}
};

export const action: ActionFunction = async ({ request }) => {
	const formData = await request.formData();

	let items: string[] = [];
	for (const value of formData.values()) {
		items.push(value as string);
	}

	return json({ items });
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
				<h1>Products</h1>
				<div className="page-header__actions">
					<Link className="button" to="import">
						Import
					</Link>
				</div>
			</header>

			<Form method="get" replace>
				<div className="search-bar">
					<SearchIcon className="search-icon" id="search-icon" />
					<input
						className="search-input"
						aria-labelledby="search-icon"
						type="search"
						name="query"
						id="query"
						placeholder="Search"
					/>
					<button className="primary button" type="submit">
						Search
					</button>
				</div>
			</Form>

			{data.results ? (
				<>
					<div className="message">
						{data.results.length} products found
					</div>

					<table style={{ marginTop: '36px' }}>
						<thead>
							<tr>
								<th>
									<input
										ref={masterCheckboxRef}
										id="master-checkbox"
										type="checkbox"
										onChange={handleMasterCheckboxChange}
									/>
								</th>
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
											<input
												type="checkbox"
												name="item"
												value={product.id}
												onChange={handleChange}
											/>
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
