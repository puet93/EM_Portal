import { Outlet } from '@remix-run/react';

export default function SamplePage() {
	return (
		<main className="main-content">
			<Outlet />
		</main>
	);
}
