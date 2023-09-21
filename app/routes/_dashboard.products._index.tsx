import { useFetcher } from '@remix-run/react';
import { SearchIcon } from '~/components/Icons';

export default function ProductsPage() {
	const search = useFetcher();
	return (
		<>
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
						defaultValue="tatum"
					/>
					<button className="primary button" type="submit">
						Search
					</button>
				</div>
			</search.Form>

			<table style={{ marginTop: '36px' }}>
				<tbody>
					<tr>
						<th>Description</th>
						<th>Item No</th>
					</tr>

					{search.data?.results &&
						search.data.results.map((product: any) => {
							return (
								<tr key={product.id}>
									<td>
										<div>{product.title}</div>
										<div>{product.sku}</div>
									</td>

									{product.vendorProduct?.itemNo ? (
										<td>{product.vendorProduct.itemNo}</td>
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
	);
}
