import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { getOrder } from '~/orders.server';

export const loader = async ({ params, request }: LoaderArgs) => {
	await requireUserId(request);
	const order = await getOrder(params.orderId);
	return json({ order });
};

export default function OrderPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div className="orders-detail-page">
			<header>
				<h1 className="headline-h3">Order ID: {data.order?.id}</h1>
			</header>

			<Link className="button" to="/orders">
				Go Back
			</Link>

			<Link
				className="primary button"
				to="labels"
				target="_blank"
				reloadDocument
			>
				Print All
			</Link>

			<div>
				<label htmlFor="status">Status</label>
				<select id="status" name="status">
					<option value="DRAFT">Draft</option>
					<option value="NEW">New</option>
					<option value="PROCESSING">Processing</option>
					<option value="COMPLETE">Complete</option>
					<option value="CANCELLED">Cancelled</option>
				</select>
			</div>

			<ul className="order-list">
				{data.order?.items.map((item) => (
					<li className="order-list-item" key={item.id}>
						<div>
							<h3>{item.product.title}</h3>
							<p>{item.product.sku}</p>
							<p>{item.product.vendorProduct.itemNo}</p>
						</div>

						<button className="button button--sm">
							Print Label
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
