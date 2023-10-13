import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';

export const loader: LoaderFunction = async ({ params, request }) => {
	const sample = await prisma.sample.findFirst({
		where: { id: params.sampleId },
	});
	return json({ sample });
};

export default function SampleDetailPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div>
			<h1>Sample Details</h1>

			<p>{data.sample.seriesName}</p>
			<p>{data.sample.color}</p>
			<p>{data.sample.finish}</p>
			<p>{data.sample.materialNo}</p>

			<Link to="edit">Edit</Link>

			<Outlet />
		</div>
	);
}
