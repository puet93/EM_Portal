import { Link, Outlet } from '@remix-run/react';

export default function OrdersPage() {
	return (
		<div className="orders-page">
			<h1>
				<Link to="/orders">Orders</Link>
			</h1>

			<Outlet />
		</div>
	);
}
