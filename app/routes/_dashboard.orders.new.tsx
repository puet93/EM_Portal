import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Outlet } from '@remix-run/react';
import { requireSuperAdmin } from '~/session.server';

export const loader: LoaderFunction = async ({ request }) => {
	const user = await requireSuperAdmin(request);

	return json({ user });
};

export default function OrdersNew() {
	return <Outlet />;
}
