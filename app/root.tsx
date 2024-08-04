import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
	Links,
	LiveReload,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from '@remix-run/react';
import clsx from 'clsx';
import { ThemeProvider, useTheme } from './utils/theme-provider';
import { getUser } from '~/session.server';
import styles from '~/styles/global.css';
import tailwindStyles from './tailwind.css?url';

export const links: LinksFunction = () => {
	return [
		{ rel: 'stylesheet', href: styles },
		{ rel: 'stylesheet', href: tailwindStyles },
	];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
	return json({ user: await getUser(request) });
};

function App() {
	const [theme] = useTheme();

	return (
		<html lang="en" className={clsx(theme)}>
			<head>
				<meta charSet="utf-8" />
				<meta
					name="viewport"
					content="width=device-width,initial-scale=1"
				/>
				<Meta />
				<Links />
			</head>
			<body className="h-full bg-white dark:bg-zinc-900">
				<Outlet />
				<ScrollRestoration />
				<Scripts />
				<LiveReload />
			</body>
		</html>
	);
}

export default function AppWithProviders() {
	return (
		<ThemeProvider>
			<App />
		</ThemeProvider>
	);
}
