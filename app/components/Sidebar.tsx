import React, { useState } from 'react';
import { Form, useLocation } from '@remix-run/react';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
	Bars3Icon,
	Cog6ToothIcon,
	FolderIcon,
	HomeIcon,
	UsersIcon,
	MoonIcon,
} from '@heroicons/react/24/outline';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

import type { User } from '@prisma/client';

const navigation = [
	{ name: 'Orders', href: '/orders', icon: HomeIcon },
	{ name: 'Products', href: '/products', icon: FolderIcon },
	{ name: 'Vendors', href: '/vendors', icon: FolderIcon },
	{ name: 'Samples', href: '/samples', icon: FolderIcon },
	{ name: 'Users', href: '/users', icon: UsersIcon },
];

function classNames(...classes) {
	return classes.filter(Boolean).join(' ');
}

function getAbbreviation(firstName: string, lastName?: string): string {
	if (lastName) {
		// Return the first letter of the first name and the first letter of the last name
		return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
	} else {
		// Return the first two letters of the first name if last name is not available
		return firstName.substring(0, 2).toUpperCase();
	}
}

interface SidebarProps {
	user: User;
	toggleTheme: () => void;
	children: React.ReactNode;
}

export function Sidebar({ user, toggleTheme, children }: SidebarProps) {
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const location = useLocation();

	const updatedNavigation = navigation.map((item) => ({
		...item,
		current: location.pathname.startsWith(item.href),
	}));

	return (
		<div>
			<div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
				{/* Sidebar component, swap this element with another sidebar if you like */}
				<div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-zinc-900 px-6 pb-4 dark:border-zinc-800">
					<div className="flex h-16 shrink-0 items-center">
						<span className="block text-base font-bold text-white">
							Edward Martin
						</span>
					</div>
					<nav className="flex flex-1 flex-col">
						<ul className="flex flex-1 flex-col gap-y-7">
							<li>
								<ul className="-mx-2 space-y-1">
									{updatedNavigation.map((item) => (
										<li key={item.name}>
											<a
												href={item.href}
												className={classNames(
													item.current
														? 'bg-zinc-800 text-white'
														: 'text-zinc-400 hover:bg-zinc-800 hover:text-white',
													'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-colors'
												)}
											>
												<item.icon
													aria-hidden="true"
													className="h-6 w-6 shrink-0"
												/>
												{item.name}
											</a>
										</li>
									))}
								</ul>
							</li>

							{/* Settings */}
							<li className="mt-auto">
								<a
									href="/settings"
									className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-zinc-400 hover:bg-zinc-800 hover:text-white"
								>
									<Cog6ToothIcon
										aria-hidden="true"
										className="h-6 w-6 shrink-0"
									/>
									Settings
								</a>
							</li>
						</ul>
					</nav>
				</div>
			</div>

			<div className="lg:pl-72">
				<div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:gap-x-6 sm:px-6 lg:px-8">
					<button
						type="button"
						onClick={() => setSidebarOpen(true)}
						className="-m-2.5 p-2.5 text-gray-700 dark:text-zinc-300 lg:hidden"
					>
						<span className="sr-only">Open sidebar</span>
						<Bars3Icon aria-hidden="true" className="h-6 w-6" />
					</button>

					{/* Separator */}
					<div
						aria-hidden="true"
						className="h-6 w-px bg-gray-900/10 dark:bg-zinc-100/10 lg:hidden"
					/>

					<div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
						<div className="ml-auto flex items-center gap-x-4 lg:gap-x-6">
							<button
								type="button"
								className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
								onClick={toggleTheme}
							>
								<span className="sr-only">
									Toggle dark mode
								</span>
								<MoonIcon
									aria-hidden="true"
									className="h-6 w-6"
								/>
							</button>

							{/* Separator */}
							<div
								aria-hidden="true"
								className="hidden bg-gray-900/10 dark:bg-zinc-100/10 lg:block lg:h-6 lg:w-px"
							/>

							{/* Profile dropdown */}
							<Menu as="div" className="relative">
								<MenuButton className="-m-1.5 flex items-center p-1.5">
									<span className="sr-only">
										Open user menu
									</span>
									<span className="inline-block h-8 w-8 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-100">
										<svg
											fill="currentColor"
											viewBox="0 0 24 24"
											className="h-full w-full text-gray-300 dark:text-zinc-300"
										>
											<path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
										</svg>
									</span>

									<span className="hidden lg:flex lg:items-center">
										<span
											aria-hidden="true"
											className="ml-4 text-sm font-semibold leading-6 text-gray-900 dark:text-white"
										>
											{`${user.firstName ?? ''} ${
												user.lastName ?? ''
											}`.trim() || 'User'}
										</span>
										<ChevronDownIcon
											aria-hidden="true"
											className="ml-2 h-5 w-5 text-gray-400"
										/>
									</span>
								</MenuButton>
								<MenuItems
									transition
									className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
								>
									<MenuItem>
										<a
											href={`/settings`}
											className="block px-3 py-1 text-sm leading-6 text-gray-900 data-[focus]:bg-gray-100"
										>
											Your profile
										</a>
									</MenuItem>

									<MenuItem>
										<button
											className="block w-full px-3 py-1 text-left text-sm leading-6 text-gray-900 data-[focus]:bg-gray-100"
											type="submit"
											form="logoutForm"
										>
											Sign out
										</button>
									</MenuItem>
								</MenuItems>
							</Menu>

							<Form
								method="post"
								action="/logout"
								id="logoutForm"
								className="hidden"
							></Form>
						</div>
					</div>
				</div>

				<main className="py-10">
					<div className="px-4 sm:px-6 lg:px-8">{children}</div>
				</main>
			</div>
		</div>
	);
}
