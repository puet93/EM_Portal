import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, Link, Outlet, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';
import { requireUserId } from '~/session.server';
import { badRequest } from '~/utils/request.server';

export const loader: LoaderFunction = async ({ params, request }) => {
	await requireUserId(request);

	const sample = await prisma.sample.findFirst({
		where: { id: params.sampleId },
	});

	if (!sample) return badRequest({ message: 'Unable to find sample.' });

	const connected = await prisma.vendorProduct.findMany({
		where: {
			sampleMaterialNo: sample.materialNo,
		},
		include: {
			vendor: true,
		},
	});

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
			sampleMaterialNo: null,
		},
		include: {
			vendor: true,
		},
	});

	return json({ connected, vendorProducts, sample });
};

export const action: ActionFunction = async ({ params, request }) => {
	await requireUserId(request);

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
		<div className="foobar">
			<div className="foobar-main-content">
				<h1>Sample Swatch</h1>

				<div style={{ marginTop: 24, marginBottom: 24 }}>
					<p className="title">
						{data.sample.seriesName} {data.sample.color}{' '}
						{data.sample.finish}
					</p>
					<p className="caption">{data.sample.materialNo}</p>
				</div>

				{data.connected && data.connected.length !== 0 ? (
					<div style={{ marginTop: 24, marginBottom: 24 }}>
						<h2>Connected Sample Swatches</h2>
						<ul className="foobar-card-list">
							{data.connected.map((product) => (
								<li key={product.id}>
									<Link
										className="foobar-card"
										to={`/vendors/${product.vendor.id}/products/${product.id}`}
									>
										<p className="title">
											{product.seriesName}{' '}
											{product.description}{' '}
											{product.finish} {product.color}
										</p>
										<p className="caption">
											{product.itemNo}
										</p>
									</Link>
								</li>
							))}
						</ul>
					</div>
				) : (
					<div className="error message">
						No product connected to sample swatch.
					</div>
				)}

				{data.vendorProducts && data.vendorProducts.length !== 0 ? (
					<Form method="post" replace>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								marginTop: 48,
								marginBottom: 24,
							}}
						>
							<h2>Possible Matching Products</h2>
							<button type="submit" className="primary button">
								Save
							</button>
						</div>
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

											{product.sampleMaterialNo !==
												null &&
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

											{product.sampleMaterialNo !==
												null &&
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
				) : null}
			</div>

			<Outlet />
		</div>
	);
}
