import { useFetcher } from '@remix-run/react';

export default function ProductsPage() {
	const search = useFetcher();
	return (
		<>
			<search.Form method="post" action="/search">
				<div className="input">
					<label htmlFor="query">Search</label>
					<input
						type="search"
						name="query"
						id="query"
						defaultValue="1104199"
					/>
				</div>
				<button type="submit">Search</button>
			</search.Form>

			<table>
				<tr>
					<th>Description</th>
				</tr>

				{search.data?.results &&
					search.data.results.map((product: any) => {
						return (
							<tr key={product.id}>
								<td>{product.title}</td>
							</tr>
						);
					})}
			</table>
		</>
	);
}
