import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Outlet } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';

export const loader = async ({ request }: LoaderArgs) => {
	await requireUserId(request);
	const vendors = await prisma.vendor.findMany();
	return json({ vendors });
};

export default function VendorDetailPage() {
	return (
		<>
			<header>
				<h1>Florim</h1>
			</header>
			<Outlet />
		</>
	);
}
