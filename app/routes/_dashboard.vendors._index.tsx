import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';

// export const action = async ({ request }: ActionArgs) => {
// 	await requireUserId(request);

// 	if (request.method !== 'POST') {
// 		return json({ message: 'Method not supported' }, 405);
// 	}

// 	const formData = await request.formData();
// 	const vendorName = formData.get('vendorName');

// 	if (typeof vendorName !== 'string' || vendorName.length === 0) {
// 		return json({ message: 'Invalid form input' });
// 	}

// 	return json({
// 		vendor: await prisma.vendor.create({ data: { name: vendorName } }),
// 	});
// };

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
