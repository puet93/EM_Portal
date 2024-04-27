import { Outlet } from '@remix-run/react';

export default function OrdersPage() {
	return (
		<main className="content">
			<div className="wrapper">
				<Outlet />
			</div>
		</main>
	);
}
