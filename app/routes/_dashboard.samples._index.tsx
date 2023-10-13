import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';

export const loader: LoaderFunction = async ({ request }) => {
	const samples = await prisma.sample.findMany({
		include: { vendorProducts: true },
	});
	return json({ samples });
};
export default function SamplesPage() {
	const data = useLoaderData<typeof loader>();
	return (
		<div>
			<h1>Samples List</h1>

			{data.samples ? (
				<table style={{ width: 'auto' }}>
					<tbody>
						{data.samples.map((sample) => (
							<tr className="row" key={sample.id}>
								<td>
									{sample.vendorProducts.length !== 0 ? (
										<span className="success indicator"></span>
									) : (
										<span className="indicator"></span>
									)}
								</td>
								<td>
									<Link to={`${sample.id}/edit`}>
										{sample.materialNo}
									</Link>
								</td>
								<td>
									<Link to={`${sample.id}/edit`}>
										{sample.seriesName}
									</Link>
								</td>
								<td>
									<Link to={`${sample.id}/edit`}>
										{sample.color}
									</Link>
								</td>
								<td>
									<Link to={`${sample.id}/edit`}>
										{sample.finish}
									</Link>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			) : null}
		</div>
	);
}
