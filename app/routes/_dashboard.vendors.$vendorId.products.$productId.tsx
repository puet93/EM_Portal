import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, Link, Outlet, useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { badRequest } from '~/utils/request.server';

export const loader: LoaderFunction = async ({ params, request }) => {
	await requireUserId(request);
	const product = await prisma.vendorProduct.findUnique({
		where: { id: params.productId },
	});

	if (!product) {
		return badRequest({ message: 'Unable to locate product.' });
	}

	return json({ product });
};

export const action: ActionFunction = async ({ params, request }) => {
	await requireUserId(request);
	await prisma.vendorProduct.update({
		where: { id: params.productId },
		data: {
			sample: {
				disconnect: true,
			},
		},
	});
	return redirect('..');
};

export default function VendorProductsPage() {
	const data = useLoaderData<typeof loader>();
	const product = data.product;

	return (
		<div style={{ display: 'flex' }}>
			<div style={{ flexGrow: 1 }}>
				<Link to="edit">
					<h2>
						{product.seriesName} {product.description}{' '}
						{product.color} {product.finish}
					</h2>
					<p>{product.itemNo}</p>
				</Link>

				<Link className="primary button" to="edit">
					Edit
				</Link>

				{product.sampleMaterialNo ? (
					<Form method="post">
						<button className="button">Disconnect</button>
					</Form>
				) : (
					<Link className="button" to="samples">
						Connect Samples
					</Link>
				)}
			</div>

			<Outlet />
		</div>
	);
}
