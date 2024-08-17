import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { badRequest } from '~/utils/request.server';

import { Input } from '~/components/Input';

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
	const { _action, ...entries } = Object.fromEntries(formData);

	if (_action === 'search') {
		const fields = Object.entries(entries);
		const query = {};

		for (const [key, value] of fields) {
			if (value) {
				query[key] = {
					contains: value,
					mode: 'insensitive',
				};
			}
		}

		const results = await prisma.sample.findMany({
			where: query,
		});

		return json({ results });
	}

	if (entries.sampleId && typeof entries.sampleId === 'string') {
		const connected = await prisma.vendorProduct.update({
			where: { id: params.productId },
			data: {
				sample: {
					connect: { id: entries.sampleId },
				},
			},
		});

		console.log('CONNECTED?', connected);

		return redirect('..');
	}
};

export default function VendorProductsPage() {
	const actionData = useActionData<typeof action>();
	const data = useLoaderData<typeof loader>();
	const product = data.product;

	return (
		<section style={{ minWidth: 370 }}>
			<Form method="post">
				<h1>Search for sample</h1>

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

				<button
					type="submit"
					className="button"
					name="_action"
					value="search"
				>
					Search
				</button>
			</Form>

			{actionData?.results ? (
				<>
					<h2>Results</h2>
					<ul>
						{actionData.results.map((sample) => (
							<li key={sample.id}>
								<span>
									{sample.materialNo}: {sample.seriesName}{' '}
									{sample.color} {sample.finish}
								</span>
								<Form method="post">
									<button
										type="submit"
										name="sampleId"
										value={sample.id}
									>
										Connect
									</button>
								</Form>
							</li>
						))}
					</ul>
				</>
			) : null}

			{actionData && actionData.results.length === 0 ? (
				<div className="error message">No results</div>
			) : null}
		</section>
	);
}
