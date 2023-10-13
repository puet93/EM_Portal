import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
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

export default function VendorProductsPage() {
	const data = useLoaderData<typeof loader>();
	const product = data.product;

	return (
		<div style={{ display: 'flex' }}>
			<div style={{ flexGrow: 1 }}>
				<h2>
					{product.seriesName} {product.description} {product.color}{' '}
					{product.finish}
				</h2>
				<p>{product.itemNo}</p>

				{product.sampleMaterialNo ? (
					<p>
						<span
							className="success indicator"
							style={{ marginRight: 8 }}
						></span>
						Has sample
					</p>
				) : (
					<Link to="samples">Connect Samples</Link>
				)}
			</div>

			<Outlet />
		</div>
	);
}
