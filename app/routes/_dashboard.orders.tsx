import { Outlet } from '@remix-run/react';

export default function OrdersPage() {
	return (
		<div className="mx-auto max-w-7xl">
			<Outlet />
		</div>
	);
}
