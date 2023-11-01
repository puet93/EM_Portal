import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Outlet, useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { badRequest } from '~/utils/request.server';
import Input from '~/components/Input';

export const loader: LoaderFunction = async ({ params, request }) => {
	await requireUserId(request);

	const product = await prisma.retailerProduct.findUnique({
		where: { id: params.productId },
	});

	if (!product) {
		return badRequest({ message: 'Unable to find product.' });
	}
	return json({ product });
};

export const action: ActionFunction = async ({ request }) => {
	return json({});
};

export default function ProductDetailPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div className="wrapper">
			<header>
				<h1 className="headline-h3">Product Details</h1>
				<div className="text">{data.product.title}</div>
			</header>

			<div className="foobar">
				<section className="foobar-main-content">
					<Form method="post">
						<Input
							label="Title"
							id="title"
							name="title"
							defaultValue={data.product.title}
						/>
						<button className="primary button">Update</button>
					</Form>
				</section>

				<Outlet />
			</div>
		</div>
	);
}
