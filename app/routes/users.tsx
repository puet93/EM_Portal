import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';

export const loader = async ({ request }: LoaderArgs) => {
	await requireUserId(request);
	return json({ users: await prisma.user.findMany() });
};
