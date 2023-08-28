import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Outlet } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { createUser, getUserByEmail } from '~/models/user.server';
import { validateEmail } from '~/utils';

export const loader = async ({ request }: LoaderArgs) => {
	await requireUserId(request);
	return json({});
};

export default function UserPage() {
	return (
		<main className="main-content">
			<Outlet />
		</main>
	);
}
