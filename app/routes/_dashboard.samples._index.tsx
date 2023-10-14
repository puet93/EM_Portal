import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';
import Input from '~/components/Input';

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

export default function SamplesPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div>
			<h1>Samples List</h1>

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

			{data.samples ? (
				<table style={{ width: 'auto' }}>
					<tbody>
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
									<Link to={sample.id}>{sample.color}</Link>
								</td>
								<td>
									<Link to={sample.id}>{sample.finish}</Link>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			) : null}
		</div>
	);
}
