import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import Input from '~/components/Input';

export const loader: LoaderFunction = async ({ params, request }) => {
	await requireUserId(request);
	const sample = await prisma.sample.findFirst({
		where: { id: params.sampleId },
	});
	return json({ sample });
};

export const action: ActionFunction = async ({ params, request }) => {
	await requireUserId(request);
	const formData = await request.formData();
	const seriesName = formData.get('seriesName');
	const color = formData.get('color');
	const finish = formData.get('finish');
	const materialNo = formData.get('materialNo');

	if (
		typeof seriesName === 'string' &&
		typeof color === 'string' &&
		typeof finish === 'string' &&
		typeof materialNo === 'string'
	) {
		await prisma.sample.update({
			where: {
				id: params.sampleId,
			},
			data: {
				seriesName,
				color,
				finish,
				materialNo,
			},
		});

		return redirect('..');
	}
};

export default function SampleDetailPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div className="foobar-sidebar">
			<h1>Edit Sample Swatch</h1>

			<Form method="post" replace>
				<Input
					label="Series"
					id="series"
					name="seriesName"
					defaultValue={data.sample.seriesName}
				/>

				<Input
					label="Color"
					id="color"
					name="color"
					defaultValue={data.sample.color}
				/>

				<Input
					label="Finish"
					id="finish"
					name="finish"
					defaultValue={data.sample.finish}
				/>

				<Input
					label="Material No."
					id="material-number"
					name="materialNo"
					defaultValue={data.sample.materialNo}
				/>

				<button type="submit" className="button">
					Update
				</button>
			</Form>
		</div>
	);
}
