import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, Outlet, useLoaderData } from '@remix-run/react';
import { requireUser } from '~/session.server';

export const loader: LoaderFunction = async ({ request }) => {
	const user = await requireUser(request);

	return json({ user });
};

export default function DashboardLayout() {
	const data = useLoaderData<typeof loader>();

	return (
		<div className="dashboard">
			<header className="dashboard-header">
				<div>Hello, {data.user.firstName}</div>
				<Form method="post" action="/logout">
					<button type="submit">Logout</button>
				</Form>
			</header>
			<nav className="dashboard-nav">
				<ul className="dashboard-nav-list">
					<li>
						<Link to="/orders">Orders</Link>
					</li>
					<li>
						<Link to="/settings">Settings</Link>
					</li>
				</ul>
			</nav>
			<Outlet />
		</div>
	);
}
