import { Outlet } from '@remix-run/react';

export default function RetailerProductPage() {
	return (
		<main className="products-page">
			<Outlet />
		</main>
	);
}
