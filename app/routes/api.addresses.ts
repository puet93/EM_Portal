import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { prisma } from '~/db.server';
import { requireSuperAdmin } from '~/session.server';

export const loader: LoaderFunction = async ({ request }) => {
	await requireSuperAdmin(request);
	const addresses = await prisma.address.findMany({});
	return json({ addresses });
};
