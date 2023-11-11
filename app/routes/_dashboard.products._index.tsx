import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useFetcher } from '@remix-run/react';
import type { RefObject, SyntheticEvent } from 'react';
import { useEffect, useRef } from 'react';
import { SearchIcon } from '~/components/Icons';
import { requireUserId } from '~/session.server';

export const loader: LoaderFunction = async ({ request }) => {
	await requireUserId(request);
	return json({});
};

export default function ProductsPage() {
	const search = useFetcher();
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
	}, [search]);

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
		<div className="wrapper">
			<header className="page-header">
				<h1>Products</h1>
				<div className="page-header__actions">
					<Link className="button" to="import">
						Import
					</Link>
				</div>
			</header>

			<search.Form method="post" action="/search">
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
			</search.Form>

			{search.data?.results ? (
				<div className="message">
					{search.data?.results.length} products found
				</div>
			) : null}

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
						<th>Sample Material No.</th>
					</tr>
				</thead>

				<tbody ref={tableBodyRef}>
					{search.data?.results &&
						search.data.results.map((product: any) => {
							return (
								<tr key={product.id}>
									<td>
										<input
											type="checkbox"
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
												{product.vendorProduct.itemNo
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
												{product.vendorProduct
													.description
													? product.vendorProduct
															.description
													: 'Missing size'}
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

									{product.vendorProduct?.sample ? (
										<td>
											{
												product.vendorProduct?.sample
													.materialNo
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
		</div>
	);
}
