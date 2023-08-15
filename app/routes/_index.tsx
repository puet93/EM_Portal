import type { V2_MetaFunction } from '@remix-run/node';
import { Link, useFetcher } from '@remix-run/react';

import { useOptionalUser } from '~/utils';

export const meta: V2_MetaFunction = () => [
	{ title: 'Label Printer - Edward Martin' },
];

export default function Index() {
	const user = useOptionalUser();
	const search = useFetcher();

	return (
		<main>
			{user ? (
				<div>
					<search.Form method="post" action="/search">
						<label htmlFor="query">Search</label>
						<input
							id="query"
							name="query"
							type="search"
							placeholder="Search by item no. or SKU."
						/>
						<button type="submit">Search</button>
					</search.Form>

					{search.data ? (
						<table>
							<tr>
								<th>
									<input type="checkbox" />
								</th>
								<th>Title</th>
								<th>Edward Martin Item No.</th>
								<th>Florim Item No.</th>
							</tr>
							{search.data.results.length > 0 ? (
								search.data.results.map((result) => (
									<tr key={result.id}>
										<td>
											<input type="checkbox" />
										</td>
										<td>{result.title}</td>
										<td>{result.sku}</td>
										<td>{result.vendorProduct.itemNo}</td>
										<td>
											<button
												onClick={() => {
													var mywindow = window.open(
														'',
														'PRINT'
													);
													mywindow.document.write(
														'<html><head><title>Sample Label</title>'
													);
													mywindow.document.write(
														'</head><body>'
													);
													mywindow.document.write(
														'<h1>SAMPLE LABEL</h1>'
													);
													mywindow.document.write(
														`<p>${result.title}</p>`
													);
													mywindow.document.write(
														'</body></html>'
													);
													mywindow.print();
													mywindow.close();
												}}
											>
												Print Label
											</button>
										</td>
									</tr>
								))
							) : (
								<div>No results</div>
							)}
						</table>
					) : null}
				</div>
			) : (
				<div>
					<Link to="/login">Log In</Link>
				</div>
			)}
		</main>
	);
}
