import { Outlet } from '@remix-run/react';

export default function FulFillmentsPage() {
	return (
		<main className="content">
			<div className="wrapper">
				<Outlet />
			</div>
		</main>
	);
}
