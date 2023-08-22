import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, Outlet } from '@remix-run/react';
import { requireUser } from '~/session.server';

export const loader: LoaderFunction = async ({ request }) => {
	const user = await requireUser(request);

	return json({ user });
};

export default function DashboardLayout() {
	// const data = useLoaderData<typeof loader>();

	return (
		<div className="dashboard">
			<header className="dashboard-header">
				<h1>Edward Martin Label Printer</h1>
				<Form method="post" action="/logout">
					<button className="button" type="submit">
						Logout
					</button>
				</Form>
			</header>
			<nav className="dashboard-nav">
				<ul className="dashboard-nav-list">
					<li>
						<Link className="dashboard-nav-item" to="/orders">
							Orders
						</Link>
					</li>
					<li>
						<Link className="dashboard-nav-item" to="/products">
							Products
						</Link>
					</li>
					<li>
						<Link className="dashboard-nav-item" to="/settings">
							Settings
						</Link>
					</li>
				</ul>
			</nav>
			<Outlet />
		</div>
	);
}
