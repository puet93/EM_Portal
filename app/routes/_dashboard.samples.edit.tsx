import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';
import { requireUserId } from '~/session.server';
import { Input } from '~/components/Input';
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
	const sampleIds = formData.getAll('sampleId');
	const seriesAlias = formData.get('seriesAlias');
	const colorAlias = formData.get('colorAlias');

	if (!sampleIds) {
		return badRequest({ message: 'Nothing to update' });
	}

	if (typeof seriesAlias !== 'string' && typeof colorAlias !== 'string') {
		return badRequest({ message: 'Nothing to update' });
	}

	let data = {};
	if (typeof seriesAlias === 'string' && seriesAlias.length !== 0) {
		data.seriesAlias = seriesAlias;
	}

	if (typeof colorAlias === 'string' && colorAlias.length !== 0) {
		data.colorAlias = colorAlias;
	}

	const updated = await prisma.$transaction(
		sampleIds.map((sampleId) => {
			return prisma.sample.update({
				where: { id: sampleId },
				data: data,
			});
		})
	);

	return json({ updated });
};

export default function SamplesPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<>
			<h1 className="headline-h3">Bulk Edit Samples</h1>

			<div className="foobar">
				<div className="foobar-main-content">
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

					<Form method="post">
						<div className="table-toolbar inline-form">
							<Input
								label="Series alias"
								id="series-alias"
								name="seriesAlias"
							/>

							<Input
								label="Color alias"
								id="color-alias"
								name="colorAlias"
							/>

							<button
								className="primary button"
								type="submit"
								name="_action"
								value="update"
							>
								Update
							</button>
						</div>

						{data.samples ? (
							<table>
								<tbody>
									{data.samples.map((sample) => (
										<tr className="row" key={sample.id}>
											<td>
												<input
													type="checkbox"
													name="sampleId"
													value={sample.id}
													defaultChecked
												/>
											</td>
											<td>
												{sample.vendorProducts
													.length !== 0 ? (
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

											<td>{sample.seriesAlias}</td>
											<td>{sample.colorAlias}</td>

											<td>
												{sample.gid ? (
													<span className="success indicator"></span>
												) : (
													<span className="indicator"></span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						) : null}
					</Form>
				</div>
			</div>
		</>
	);
}
