import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';

export const action = async ({ params, request }: ActionFunctionArgs) => {
	await requireUserId(request);

	const productId = params.productId;
	const formData = await request.formData();
	const { ...values } = Object.fromEntries(formData);

	const product = await prisma.retailerProduct.update({
		where: {
			id: productId,
		},
		data: values,
	});

	if (!product) {
		return json({ error: 'Could not update product.' }, 500);
	}

	return json({ product });
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	await requireUserId(request);

	const product = await prisma.retailerProduct.findUnique({
		where: { id: params.productId },
	});

	return json({ product });
};

export default function RetailerProductsPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	return (
		<main className="main-content">
			<div className="page-content">
				<Form method="post" replace>
					<div className="input">
						<label>Title</label>
						<input
							type="text"
							defaultValue={data.product?.title}
							name="title"
						/>
					</div>

					<button type="submit">Submit</button>
				</Form>
			</div>

			{actionData?.product ? (
				<div className="success message">Success!</div>
			) : null}
		</main>
	);
}
