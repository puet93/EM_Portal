import type { ActionFunction, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';

export const loader = async ({ params, request }: LoaderArgs) => {
	const orderId = params.orderId;

	if (typeof orderId !== 'string' || orderId.length === 0) {
		return json({});
	}

	const order = await prisma.order.findUnique({
		where: { id: orderId },
		include: {
			address: true,
			items: {
				include: {
					product: {
						include: {
							vendorProduct: {
								include: {
									sample: true,
								},
							},
						},
					},
				},
			},
		},
	});
	return json({ order });
};

export const action: ActionFunction = async ({ params, request }) => {
	await prisma.order.update({
		where: { id: params.orderId },
		data: { status: 'PROCESSING' },
	});

	return json({});
};

export default function OrderPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div className="orders-detail-page">
			<header className="page-header">
				<div>
					<h1 className="headline-h3">Sample Order</h1>
					<p className="caption">{data.order?.id}</p>
				</div>
			</header>

			{data.order.address ? (
				<>
					<h2 className="headline-h5">Ship To</h2>
					<address className="text">
						{data.order.address.line1}
						<br />
						{data.order.address.line2}
						<br />
						{data.order.address.city}, {data.order.address.state}{' '}
						{data.order.address.postalCode}
					</address>
				</>
			) : null}

			<div className="table-toolbar">
				<h2 className="table-toolbar-title headline-h5">Line Items</h2>

				<div className="table-toolbar-actions">
					{/* <Form method="post">
						<button
							className="button"
							type="submit"
							name="_action"
							value="setStatus"
						>
							Mark as Processing
						</button>
					</Form> */}

					<Link
						className="primary button"
						to="labels"
						target="_blank"
						reloadDocument
					>
						Print Labels
					</Link>
				</div>
			</div>

			<table>
				<thead>
					<tr>
						<th>Item</th>
						<th>Florim Item No.</th>
						<th>Material No</th>
						<th>Quantity</th>
					</tr>
				</thead>

				<tbody>
					{data.order?.items.map((item) => (
						<tr key={item.id}>
							<td>
								<p className="title">{item.product.title}</p>
								<p className="caption">{item.product.sku}</p>
							</td>

							<td>
								<p>{item.product.vendorProduct.seriesName}</p>
								<p>{item.product.vendorProduct.color}</p>
								<p>{item.product.vendorProduct.finish}</p>
								<p>{item.product.vendorProduct.itemNo}</p>
							</td>
							<td>
								{item.product.vendorProduct.sample
									?.materialNo ? (
									item.product.vendorProduct.sample
										?.materialNo
								) : (
									<div>
										<span
											className="error indicator"
											style={{ marginRight: 12 }}
										></span>
										Missing sample swatch
									</div>
								)}
							</td>
							<td>{item.quantity}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
