import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
	Form,
	NavLink,
	Outlet,
	useFetcher,
	useLoaderData,
} from '@remix-run/react';
import { requireUser } from '~/session.server';
import {
	DeliveryShipmentPackagesSearchIcon,
	MoonIcon,
	PalletBoxMoveRightIcon,
	SettingsIcon,
	ShoppingInvoiceListIcon,
	SidebarMinusIcon,
	SidebarPlusIcon,
	SwatchIcon,
	UsersIcon,
} from '~/components/Icons';

import { Theme, useTheme } from '~/utils/theme-provider';
import { userPrefs } from '../cookies.server';

export const loader: LoaderFunction = async ({ request }) => {
	const user = await requireUser(request);
	const cookieHeader = request.headers.get('Cookie');
	const cookie = await userPrefs.parse(cookieHeader);

	if (cookie && cookie.hasOwnProperty('sidebarIsOpen')) {
		return json({ user, sidebarIsOpen: cookie.sidebarIsOpen });
	} else {
		return json(
			{ user, sidebarIsOpen: true },
			{
				headers: {
					'Set-Cookie': await userPrefs.serialize({
						sidebarIsOpen: true,
					}),
				},
			}
		);
	}
};

export default function DashboardLayout() {
	const fetcher = useFetcher();
	const data = useLoaderData<typeof loader>();

	if (fetcher.formData?.has('sidebar')) {
		data.sidebarIsOpen = fetcher.formData.get('sidebar') === 'open';
	}

	const [, setTheme] = useTheme();
	const toggleTheme = () => {
		setTheme((prevTheme) =>
			prevTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT
		);
	};

	return (
		<div className={data.sidebarIsOpen ? `dashboard` : `dashboard closed`}>
			<header className="dashboard-header">
				<h1>Edward Martin</h1>
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
							<span className="dashboard-nav-item__label">
								Orders
							</span>
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
									<span className="dashboard-nav-item__label">
										Products
									</span>
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
									<span className="dashboard-nav-item__label">
										Vendors
									</span>
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
									<span className="dashboard-nav-item__label">
										Samples
									</span>
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
									<span className="dashboard-nav-item__label">
										Users
									</span>
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
							<span className="dashboard-nav-item__label">
								Settings
							</span>
						</NavLink>
					</li>

					<li style={{ marginTop: 'auto' }}>
						<fetcher.Form method="post" action="/sidebar">
							<button
								className="dashboard-nav-item"
								name="sidebar"
								value={data.sidebarIsOpen ? 'close' : 'open'}
							>
								{data.sidebarIsOpen ? (
									<SidebarMinusIcon />
								) : (
									<SidebarPlusIcon />
								)}
								<span className="dashboard-nav-item__label">
									{data.sidebarIsOpen
										? 'Collapse Sidebar'
										: 'Expand Sidebar'}
								</span>
							</button>
						</fetcher.Form>
					</li>

					<li>
						<button
							className="dashboard-nav-item"
							onClick={toggleTheme}
						>
							<MoonIcon />
							<span className="dashboard-nav-item__label">
								Toggle Dark Mode
							</span>
						</button>
					</li>
				</ul>
			</nav>
			<Outlet />
		</div>
	);
}
