import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';

export const action = async ({ params, request }: ActionFunctionArgs) => {
	await requireUserId(request);

	const formData = await request.formData();
	const { ...values } = Object.fromEntries(formData);
	const { oldName, newName } = values;

	if (
		typeof oldName !== 'string' ||
		oldName.length === 0 ||
		typeof newName !== 'string' ||
		newName.length === 0
	) {
		console.log('Invalid fields');
		return json({ products: null });
	}

	console.log(values);

	const products = await prisma.retailerProduct.findMany({
		where: {
			title: {
				contains: oldName,
			},
		},
	});

	const updatedProducts = await prisma.$transaction(
		products.map((product) => {
			return prisma.retailerProduct.update({
				where: {
					id: product.id,
				},
				data: {
					title: product.title.replace(oldName, newName),
				},
			});
		})
	);

	return json({ products: updatedProducts });
};

export default function RetailerProductsPage() {
	const actionData = useActionData<typeof action>();

	return (
		<main className="main-content">
			<div className="page-content">
				<Form method="post">
					<div className="input">
						<label htmlFor="old-name">Old Name</label>
						<input type="text" name="oldName" />
					</div>

					<div className="input">
						<label htmlFor="new-name">New Name</label>
						<input type="text" name="newName" />
					</div>

					<button type="submit">Submit</button>
				</Form>
			</div>

			{actionData?.products ? (
				<div className="success message">Success!</div>
			) : null}
		</main>
	);
}
