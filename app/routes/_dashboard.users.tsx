import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Outlet } from '@remix-run/react';
import { requireUserId } from '~/session.server';

export const loader = async ({ request }: LoaderArgs) => {
	await requireUserId(request);
	return json({});
};

export default function UserPage() {
	return (
		<main className="content">
			<Outlet />
		</main>
	);
}
