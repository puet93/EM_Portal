import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, NavLink, Outlet, useLoaderData } from '@remix-run/react';
import { requireUser } from '~/session.server';
import {
	DeliveryShipmentPackagesSearchIcon,
	PalletBoxMoveRightIcon,
	SettingsIcon,
	ShoppingInvoiceListIcon,
	SwatchIcon,
	UsersIcon,
} from '~/components/Icons';

export const loader: LoaderFunction = async ({ request }) => {
	const user = await requireUser(request);
	return json({ user });
};

export default function DashboardLayout() {
	const data = useLoaderData<typeof loader>();

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
						<NavLink
							className={({ isActive }) =>
								isActive
									? 'dashboard-nav-item active'
									: 'dashboard-nav-item'
							}
							to="/orders"
						>
							<ShoppingInvoiceListIcon />
							Orders
						</NavLink>
					</li>
					{data.user.role === 'SUPERADMIN' ? (
						<>
							<li>
								<NavLink
									className={({ isActive }) =>
										isActive
											? 'dashboard-nav-item active'
											: 'dashboard-nav-item'
									}
									to="/products"
								>
									<DeliveryShipmentPackagesSearchIcon />
									Products
								</NavLink>
							</li>

							<li>
								<NavLink
									className={({ isActive }) =>
										isActive
											? 'dashboard-nav-item active'
											: 'dashboard-nav-item'
									}
									to="/vendors"
								>
									<PalletBoxMoveRightIcon />
									Vendors
								</NavLink>
							</li>

							<li>
								<NavLink
									className={({ isActive }) =>
										isActive
											? 'dashboard-nav-item active'
											: 'dashboard-nav-item'
									}
									to="/samples"
								>
									<SwatchIcon />
									Samples
								</NavLink>
							</li>

							<li>
								<NavLink
									className={({ isActive }) =>
										isActive
											? 'dashboard-nav-item active'
											: 'dashboard-nav-item'
									}
									to="/users"
								>
									<UsersIcon />
									Users
								</NavLink>
							</li>
						</>
					) : null}
					<li>
						<NavLink
							className={({ isActive }) =>
								isActive
									? 'dashboard-nav-item active'
									: 'dashboard-nav-item'
							}
							to="/settings"
						>
							<SettingsIcon />
							Settings
						</NavLink>
					</li>
				</ul>
			</nav>
			<Outlet />
		</div>
	);
}
