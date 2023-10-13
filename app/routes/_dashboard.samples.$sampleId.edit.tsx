import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';
import { badRequest } from '~/utils/request.server';

export const loader: LoaderFunction = async ({ params, request }) => {
	const sample = await prisma.sample.findFirst({
		where: { id: params.sampleId },
	});

	if (!sample) return badRequest({ message: 'Unable to find sample.' });

	const vendorProducts = await prisma.vendorProduct.findMany({
		where: {
			seriesName: {
				contains: sample.seriesName,
				mode: 'insensitive',
			},
			color: {
				contains: sample.color,
				mode: 'insensitive',
			},
		},
		include: {
			vendor: true,
		},
	});

	console.log(vendorProducts);

	return json({ vendorProducts, sample });
};

export const action: ActionFunction = async ({ params, request }) => {
	const formData = await request.formData();
	const entries = Object.fromEntries(formData);
	const values = Object.keys(entries);
	const vendorProductIds = [];

	for (const value of values) {
		vendorProductIds.push({ id: value });
	}

	if (vendorProductIds.length !== 0) {
		await prisma.sample.update({
			where: { id: params.sampleId },
			data: {
				vendorProducts: {
					connect: vendorProductIds,
				},
			},
		});
	}

	return redirect('..');
};

export default function SampleDetailPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div>
			<h2>Matching Vendor Products</h2>
			{data.vendorProducts && (
				<Form method="post" replace>
					<button type="submit" className="button">
						Save
					</button>
					<table>
						<tbody>
							{data.vendorProducts.map((product) => (
								<tr key={product.id}>
									<td>
										<input
											type="checkbox"
											name={product.id}
											defaultChecked={
												!product.sampleMaterialNo &&
												product.finish ===
													data.sample.finish
											}
										/>
									</td>
									<td>
										{!product.sampleMaterialNo ? (
											<div>
												<span
													className="indicator"
													style={{
														marginRight: '8px',
													}}
												></span>
												EMPTY
											</div>
										) : null}

										{product.sampleMaterialNo !== null &&
										product.sampleMaterialNo !==
											data.sample.materialNo ? (
											<div>
												<span
													className="error indicator"
													style={{
														marginRight: '8px',
													}}
												></span>{' '}
												DOES NOT MATCH
											</div>
										) : null}

										{product.sampleMaterialNo !== null &&
										product.sampleMaterialNo ===
											data.sample.materialNo ? (
											<div>
												<span
													className="success indicator"
													style={{
														marginRight: '8px',
													}}
												></span>{' '}
												MATCH
											</div>
										) : null}
									</td>
									<td>
										<Link
											to={`/vendors/${product.vendor.id}/products/${product.id}`}
										>
											{product.seriesName}
										</Link>
										<div>
											<span
												className={
													product.color !==
													data.sample.color
														? 'indicator error'
														: 'indicator success'
												}
											></span>{' '}
											{product.color}
										</div>
										<div>
											<span
												className={
													product.finish !==
													data.sample.finish
														? 'indicator error'
														: 'indicator success'
												}
											></span>{' '}
											{product.finish}
										</div>
									</td>
									<td>{product.thickness}</td>
									<td>{product.itemNo}</td>
								</tr>
							))}
						</tbody>
					</table>
				</Form>
			)}
		</div>
	);
}
