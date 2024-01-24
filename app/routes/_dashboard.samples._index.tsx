import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import {
	json,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';
import { requireUserId } from '~/session.server';
import { badRequest } from '~/utils/request.server';
import { graphqlClient } from '~/utils/shopify.server';
import FileDropInput from '~/components/FileDropInput';
import Input from '~/components/Input';
import { parseCSV } from '~/utils/csv';

const FILE = 'file';

export const loader: LoaderFunction = async ({ request }) => {
	const searchParams = new URL(request.url).searchParams;
	const seriesName = searchParams.get('series');
	const finish = searchParams.get('finish');
	const color = searchParams.get('color');

	const query = {};
	const fields = {};

	if (seriesName) {
		fields['series'] = seriesName;

		query['OR'] = [
			{
				seriesName: {
					contains: seriesName,
					mode: 'insensitive',
				},
			},
			{
				seriesAlias: {
					contains: seriesName,
					mode: 'insensitive',
				},
			},
		];
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
		orderBy: [{ seriesName: 'asc' }, { color: 'asc' }],
	});

	return json({ samples, fields });
};

export const action: ActionFunction = async ({ request }) => {
	await requireUserId(request);

	const handler = unstable_createMemoryUploadHandler();
	const formData = await unstable_parseMultipartFormData(request, handler);
	const _action = formData.get('_action');

	switch (_action) {
		case 'upsert': {
			const file = formData.get(FILE) as File;
			const data = await parseCSV(file);

			// const exists = await prisma.$transaction(
			// 	data.map((sample) => {
			// 		return prisma.sample.findUnique({
			// 			where: { materialNo: sample.materialNo },
			// 		});
			// 	})
			// );

			// console.log('EXISTS?', exists); // returns null if it doesn't exist

			const upsertedSamples = await prisma.$transaction(
				data.map((sample) => {
					return prisma.sample.upsert({
						where: { materialNo: sample.materialNo },
						update: {
							seriesName: sample.seriesName, // Vendor's serie's name
							color: sample.color,
							finish: sample.finish || undefined,
							seriesAlias: sample.seriesAlias || undefined,
							colorAlias: sample.colorAlias || undefined,
						},
						create: {
							materialNo: sample.materialNo,
							seriesName: sample.seriesName,
							color: sample.color,
							finish: sample.finish || undefined,
							seriesAlias: sample.seriesAlias || undefined,
							colorAlias: sample.colorAlias || undefined,
						},
					});
				})
			);

			return json({ upsertedSamples });
		}
		case 'update': {
			const file = formData.get(FILE) as File;
			const data = await parseCSV(file);

			const updatedSamples = await prisma.$transaction(
				data.map((sample) => {
					return prisma.sample.update({
						where: { materialNo: sample.materialNo },
						data: { finish: sample.finish },
					});
				})
			);

			console.log('UPDATED:', updatedSamples);

			return json({ data: updatedSamples });
		}
		case 'metafields': {
			const metafieldQuery = formData.get('metafieldQuery');

			const response = await graphqlClient.query({
				data: `{
					products(first: 250, query: "title:${metafieldQuery}* AND status:ACTIVE AND tag_not:sample") {
						edges {
							node {
							id
							title
								metafield(namespace: "pdp", key: "sample") {
									id
									value
								}
							}
						}
					}
				}`,
			});

			const productCount = response.body.data.products.edges.length;
			const products = response.body.data.products.edges.map(
				(product) => product.node
			);

			const needToConnect = products.filter(
				(product) => product.metafield === null
			);

			return json({ empty: needToConnect, productCount });
		}
		default:
			return badRequest({ message: 'Invalid action' });
	}
};

export default function SamplesPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	return (
		<div>
			<h1 className="headline-h3">Samples List</h1>

			<Form method="post" encType="multipart/form-data">
				<FileDropInput id="file" name={FILE} accept=".csv" />
				<button
					className="button"
					type="submit"
					name="_action"
					value="upsert"
				>
					Upload
				</button>
			</Form>

			<div className="table-toolbar">
				<Form method="post" className="inline-form">
					<Input
						label="Series"
						id="metafield-query"
						name="metafieldQuery"
						defaultValue={data.fields.series}
					/>

					<button
						className="button"
						type="submit"
						name="_action"
						value="metafields"
					>
						Check Series
					</button>
				</Form>
			</div>

			{actionData && actionData.empty?.length === 0 ? (
				<div className="success message">
					Contgrats! {actionData.empty.length} out of{' '}
					{actionData.productCount} products without samples.
				</div>
			) : null}

			{actionData && actionData.empty?.length >= 1 ? (
				<div className="warning message">
					{actionData.empty.length} out of {actionData.productCount}{' '}
					products with samples.
				</div>
			) : null}

			{actionData && actionData.upsertedSamples ? (
				<div className="success message">UPDATED!</div>
			) : null}

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

					<Link className="button" to="new">
						Create New Sample
					</Link>
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
