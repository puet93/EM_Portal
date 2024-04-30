import type { ActionFunction, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';
import Dropdown from '~/components/Dropdown';
import { badRequest } from '~/utils/request.server';
import type { OrderStatus } from '@prisma/client';
import { requireUserId } from '~/session.server';

export const loader = async ({ params, request }: LoaderArgs) => {
	const orderId = params.orderId;

	if (typeof orderId !== 'string' || orderId.length === 0) {
		return badRequest({ order: null });
	}

	const order = await prisma.order.findUnique({
		where: { id: orderId },
		include: {
			address: true,
			lineItems: true,
			fulfillments: {
				include: {
					vendor: true,
				},
			},
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
	await requireUserId(request);

	const formData = await request.formData();
	const status = formData.get('status');

	if (typeof status !== 'string' || status.length === 0) {
		return badRequest({ message: 'Invalid request' });
	}

	const order = await prisma.order.update({
		where: { id: params.orderId },
		data: { status: status as OrderStatus },
	});
	return json({ status: order.status });
};

export default function OrderPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useLoaderData<typeof action>();

	return (
		<>
			<header className="page-header">
				<div className="page-header__row">
					<h1 className="headline-h3">Sample Order</h1>

					<div className="page-header__actions">
						<Form method="post" className="inline-form">
							<Dropdown
								name="status"
								options={[
									{ label: 'Draft', value: 'DRAFT' },
									{ label: 'New', value: 'NEW' },
									{
										label: 'Processing',
										value: 'PROCESSING',
									},
									{ label: 'Complete', value: 'COMPLETE' },
									{ label: 'Cancelled', value: 'CANCELLED' },
								]}
								defaultValue={
									actionData?.order?.status
										? actionData.order.status
										: data.order?.status
								}
							/>
							<button
								className="button"
								type="submit"
								name="_action"
								value="setStatus"
							>
								Save
							</button>
						</Form>

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

				<div className="page-header__row">
					{data.order?.name ? data.order.name : data.order?.id}
				</div>
			</header>

			{data.order?.address ? (
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

			<table>
				<thead>
					<tr>
						<th>Edward Martin</th>
						<th>Florim</th>
						<th>Material No.</th>
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
								<p className="title">
									{item.product.vendorProduct?.seriesName}
									{item.product.vendorProduct?.finish
										? ` ${item.product.vendorProduct?.finish} `
										: null}
									{item.product.vendorProduct?.color}
								</p>
								<p className="caption">
									{item.product.vendorProduct?.itemNo}
								</p>
							</td>
							<td>
								{item.product.vendorProduct?.sample
									?.materialNo ? (
									<>
										<p className="title">
											{
												item.product.vendorProduct
													.sample.seriesName
											}{' '}
											{item.product.vendorProduct.sample
												.finish
												? `${item.product.vendorProduct.sample.finish} `
												: null}
											{
												item.product.vendorProduct
													.sample.color
											}
										</p>
										<p className="caption">
											{
												item.product.vendorProduct
													.sample.materialNo
											}
										</p>
									</>
								) : (
									<div className="badge error">Missing</div>
								)}
							</td>
							<td className="align-center">{item.quantity}</td>
						</tr>
					))}
				</tbody>
			</table>
		</>
	);
}
