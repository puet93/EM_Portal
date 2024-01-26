import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';

export const loader = async ({ params, request }: LoaderArgs) => {
	await requireUserId(request);
	const vendor = await prisma.vendor.findUnique({
		where: { id: params.vendorId },
	});
	return json({ vendor });
};

export default function VendorDetailPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<>
			<header>
				<h1>{data && data.vendor?.name ? data.vendor.name : null}</h1>
			</header>

			<Outlet />
		</>
	);
}
