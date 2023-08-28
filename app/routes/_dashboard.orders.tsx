import { Outlet } from '@remix-run/react';

export default function OrdersPage() {
	return (
		<main className="orders-page">
			<Outlet />
		</main>
	);
}
