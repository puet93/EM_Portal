import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react';
import { useEffect } from 'react';
import { prisma } from '~/db.server';
import { requireUserId } from '~/session.server';
import Input from '~/components/Input';
import { badRequest } from '~/utils/request.server';
import { graphqlClient } from '~/utils/shopify.server';

export const loader: LoaderFunction = async ({ request }) => {
	const searchParams = new URL(request.url).searchParams;
	const seriesName = searchParams.get('series');
	const finish = searchParams.get('finish');
	const color = searchParams.get('color');

	const query = {};
	const fields = {};

	if (seriesName) {
		fields['series'] = seriesName;
		query['seriesName'] = {
			contains: seriesName,
			mode: 'insensitive',
		};
	}

	if (finish) {
		fields['finish'] = finish;
		query['finish'] = {
			contains: finish,
			mode: 'insensitive',
		};
	}

	if (color) {
		fields['color'] = color;
		query['color'] = {
			contains: color,
			mode: 'insensitive',
		};
	}

	const samples = await prisma.sample.findMany({
		where: query,
		include: { vendorProducts: true },
	});

	return json({ samples, fields });
};

export const action: ActionFunction = async ({ request }) => {
	await requireUserId(request);
	const formData = await request.formData();
	const sampleId = formData.get('sample');

	if (typeof sampleId !== 'string') {
		return badRequest({ message: 'Invalid sample ID' });
	}

	const sample = await prisma.sample.findUnique({
		where: {
			id: sampleId,
		},
		include: {
			vendorProducts: {
				include: {
					retailerProduct: true,
				},
			},
		},
	});

	if (!sample) {
		return badRequest({ message: 'Unable to find sample.' });
	}

	if (!sample.seriesAlias || !sample.finish || !sample.colorAlias) {
		return badRequest({ message: 'Unable to construct title' });
	}

	const title = `${sample.seriesAlias} ${sample.finish} ${sample.colorAlias} 4x4 Tile Sample`;
	const queryString = `
		mutation productCreate {
			productCreate(input: {
				title: "${title}",
				status: DRAFT,
				tags: ["sample"],
				templateSuffix: "sample",
				variants: [{ sku: "${sample.materialNo}" }]
			}) {
				product {
					id
					title
					tags
					status
					vendor
					templateSuffix
					variants(first: 1) {
						edges {
							node {
								id
								title
							}
						}
					}
				}
				userErrors {
					field
					message
				}
			}
		}
	`;

	const searchResponse = await graphqlClient.query({
		data: `
			{
				productVariants(first: 10, query:"sku:${sample.materialNo}") {
					edges {
						node {
							id
							title
						}
					}
				}
			}
		`,
	});

	console.log(`SEARCH RES for ${sample.materialNo}`, searchResponse.body);

	if (searchResponse.body?.data?.productVariants.edges.length === 0) {
		console.log('WARNING: PRODUCT EXISTS. TRY UPDATING INSTEAD.');

		try {
			const response = await graphqlClient.query({
				data: queryString,
			});
			console.log('GID', response.body);
			const gid = response.body.data.productCreate.product.id;
			await prisma.sample.update({
				where: { id: sampleId },
				data: { gid },
			});
		} catch (e) {
			console.log('Unable to create product on Shopify for some reason.');
		}

		return json({});
	}

	if (searchResponse.body?.data?.productVariants.edges.length === 1) {
		// UPDATE
		console.log('WARNING: PRODUCT EXISTS. TRY UPDATING INSTEAD.');
		return json({});
	}

	if (searchResponse.body?.data?.productVariants.edges.length > 1) {
		// DELETE EXISTING PRODUCTS ON SHOPIFY FIRST
		console.log(
			'WARNING: More than one product exists. Please resolve on Shopify before proceeding.'
		);
		return json({});
	}
};

export default function SamplesPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div>
			<h1 className="headline-h3">Samples List</h1>

			<div className="table-toolbar">
				<Form
					className="inline-form"
					method="get"
					replace
					style={{
						display: 'flex',
						alignItems: 'flex-end',
						justifyContent: 'space-between',
					}}
				>
					<Input
						label="Series"
						id="series"
						name="series"
						defaultValue={data.fields.series}
					/>

					<Input
						label="Color"
						id="color"
						name="color"
						defaultValue={data.fields.color}
					/>

					<Input
						label="Finish"
						id="finish"
						name="finish"
						defaultValue={data.fields.finish}
					/>

					<button className="primary button" type="submit">
						Search
					</button>
				</Form>
			</div>

			{data.samples ? (
				<Form method="post">
					<table>
						<tbody>
							<tr>
								<th></th>
								<th>Material No.</th>
								<th>Series</th>
								<th>Color</th>
								<th>Finish</th>
								<th style={{ textAlign: 'center' }}>Shopify</th>
							</tr>
							{data.samples.map((sample) => (
								<tr className="row" key={sample.id}>
									<td>
										{sample.vendorProducts.length !== 0 ? (
											<span className="success indicator"></span>
										) : (
											<span className="indicator"></span>
										)}
									</td>
									<td>
										<Link to={sample.id}>
											{sample.materialNo}
										</Link>
									</td>
									<td>
										<Link to={sample.id}>
											{sample.seriesName}
										</Link>
									</td>
									<td>
										<Link to={sample.id}>
											{sample.color}
										</Link>
									</td>
									<td>
										<Link to={sample.id}>
											{sample.finish}
										</Link>
									</td>
									<td style={{ textAlign: 'center' }}>
										{sample.gid ? (
											<span className="success indicator"></span>
										) : (
											<Link to={`${sample.id}/edit`}>
												Edit
											</Link>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</Form>
			) : null}
		</div>
	);
}
