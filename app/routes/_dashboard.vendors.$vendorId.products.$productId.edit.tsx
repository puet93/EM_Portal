import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { badRequest } from '~/utils/request.server';

import { Input } from '~/components/Input';

function removeEmptyValues(obj) {
	const filtered = Object.keys(obj)
		.map((k) => {
			if (obj[k]) {
				console.log(k, 'something here');
			} else {
				console.log(k, 'nothing here');
			}
			return k;
		})
		.filter((k) => {
			if (obj[k]) {
				return k;
			}
		})
		.reduce(
			(accumulator, currentValue) => ({
				...accumulator,
				[currentValue]: currentValue,
			}),
			{}
		);

	if (Object.keys(filtered).length === 0) {
		return null;
	}

	return filtered;
}

function parseFormEntries(formData) {
	const entries = Object.fromEntries(formData);
	const data = removeEmptyValues(entries);
	console.log('DATA', data);
}

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
	const formData = await request.formData();
	const entries = Object.fromEntries(formData);

	await prisma.vendorProduct.update({
		where: { id: params.productId },
		data: entries,
	});

	return json({ entries });
};

export default function VendorProductsPage() {
	const actionData = useActionData<typeof action>();
	const data = useLoaderData<typeof loader>();
	const product = data.product;

	return (
		<section style={{ minWidth: 370 }}>
			<Form method="post">
				<h1 className="headline-h5">Edit Sample</h1>

				<Input
					label="Series"
					name="seriesName"
					id="search-series-name"
					defaultValue={product.seriesName}
				/>
				<Input
					label="Color"
					name="color"
					id="search-color"
					defaultValue={product.color}
				/>
				<Input
					label="Finish"
					name="finish"
					id="search-finish"
					defaultValue={product.finish}
				/>

				<Input
					label="Item No"
					name="itemNo"
					id="item-no"
					defaultValue={product.itemNo}
				/>

				{actionData && !actionData.error ? (
					<div className="success message">Saved</div>
				) : null}

				<button type="submit" className="button">
					Save
				</button>
			</Form>
		</section>
	);
}
