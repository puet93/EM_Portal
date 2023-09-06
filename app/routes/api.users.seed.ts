import type { ActionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireSuperAdmin } from '~/session.server';
import { seedUsers } from '~/models/user.server';

export const action = async ({ request }: ActionArgs) => {
	await requireSuperAdmin(request);
	const users = await seedUsers();
	return json({ users });
};
