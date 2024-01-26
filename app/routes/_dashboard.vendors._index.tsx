import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';

export const loader = async ({ request }: LoaderArgs) => {
	await requireUserId(request);
	const vendors = await prisma.vendor.findMany();
	return json({ vendors });
};

export default function VendorsPage() {
	const data = useLoaderData<typeof loader>();
	return (
		<>
			<header>
				<h1 className="headline-h3">Vendors</h1>
				<Link className="primary button" to="new">
					Create New Vendor
				</Link>
			</header>
			<ul>
				{data.vendors.map((vendor) => (
					<li key={vendor.id}>
						<Link to={vendor.id + '/products'}>{vendor.name}</Link>
					</li>
				))}
			</ul>
		</>
	);
}
