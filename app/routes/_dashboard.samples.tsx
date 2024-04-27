import { Outlet } from '@remix-run/react';

export default function SamplePage() {
	return (
		<main className="content">
			<div className="wrapper">
				<Outlet />
			</div>
		</main>
	);
}
