import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { ArrowLeftIcon } from '~/components/Icons';
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
							vendorProduct: true,
						},
					},
				},
			},
		},
	});

	console.log(order);

	return json({ order });
};

export default function OrderPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div className="orders-detail-page">
			<header className="page-header">
				<Link to="/orders" className="circle-button circle-button--lg">
					<span className="visually-hidden">Go Back</span>
					<ArrowLeftIcon />
				</Link>
				<h1 className="headline-h3">Order ID: {data.order?.id}</h1>
			</header>

			{data.order.address ? (
				<>
					<div className="title">Ship To</div>
					<address className="caption">
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
				<h2 className="table-toolbar-title">Samples</h2>
				<Link
					className="primary button"
					to="labels"
					target="_blank"
					reloadDocument
				>
					Print Labels
				</Link>
			</div>

			<table>
				<tbody>
					<tr>
						<th className="caption">Item</th>
						<th className="caption">Florim Item No.</th>
						<th></th>
					</tr>
					{data.order?.items.map((item) => (
						<tr key={item.id}>
							<td>
								<h3 className="title">{item.product.title}</h3>
								<p className="caption">{item.product.sku}</p>
							</td>

							<td>{item.product.vendorProduct.itemNo}</td>
							<td>
								{/* <button className="button button--sm">
									Print Label
								</button> */}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
