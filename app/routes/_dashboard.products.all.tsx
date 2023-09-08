import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';

export const loader = async ({ request }: LoaderArgs) => {
	await requireUserId(request);
	const products = await prisma.retailerProduct.findMany({
		include: {
			vendorProduct: {
				include: {
					measurementPerCarton: {
						include: {
							unitOfMeasure: true,
						},
					},
				},
			},
		},
	});
	return json({ products });
};

export default function RetailerProductPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<main className="products-page">
			<div className="products-index-page">
				<header>
					<h1 className="headline-h3">All Products</h1>
				</header>

				<table>
					<tbody>
						<tr>
							<th className="caption">Description</th>
							<th className="caption">Vendor Item No.</th>
							<th className="caption">Per Carton</th>
						</tr>
						{data.products.map(({ vendorProduct, ...product }) => {
							let measurement =
								vendorProduct.measurementPerCarton;
							let text = '';

							if (measurement) {
								text =
									Number(measurement.value) > 1
										? `${measurement.value} ${measurement.unitOfMeasure.name}`
										: `${measurement.value} ${measurement.unitOfMeasure.singular}`;
							}

							return (
								<tr key={product.id}>
									<td>
										<div className="title">
											{product.title}
										</div>
										<div className="caption">
											{product.sku}
										</div>
									</td>
									<td>{vendorProduct.itemNo}</td>
									<td>{text}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</main>
	);
}
