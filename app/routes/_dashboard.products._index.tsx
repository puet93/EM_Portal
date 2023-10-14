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
					/>
					<button className="primary button" type="submit">
						Search
					</button>
				</div>
			</search.Form>

			<table style={{ marginTop: '36px' }}>
				<tbody>
					<tr>
						<th>Edward Martin</th>
						<th>Item No.</th>
						<th>Sample Material No.</th>
					</tr>

					{search.data?.results &&
						search.data.results.map((product: any) => {
							return (
								<tr key={product.id}>
									<td>
										<div>{product.title}</div>
										<div>{product.sku}</div>
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
		</>
	);
}
