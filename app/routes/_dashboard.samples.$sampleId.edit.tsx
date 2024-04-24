import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { badRequest } from '~/utils/request.server';
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
	const { _action, ...entries } = Object.fromEntries(formData);

	switch (_action) {
		case 'update': {
			await prisma.sample.update({
				where: {
					id: params.sampleId,
				},
				data: entries,
			});

			return redirect('..');
		}
		case 'delete': {
			await prisma.sample.delete({
				where: {
					id: params.sampleId,
				},
			});

			return redirect('../..');
		}
		default:
			return badRequest({ message: 'Invalid action' });
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

				<Input
					label="Series Alias"
					id="series-alias"
					name="seriesAlias"
					defaultValue={data.sample.seriesAlias}
				/>

				<Input
					label="Color Alias"
					id="color-alias"
					name="colorAlias"
					defaultValue={data.sample.colorAlias}
				/>

				<button
					name="_action"
					value="update"
					type="submit"
					className="button"
				>
					Update
				</button>

				<button
					name="_action"
					value="delete"
					type="submit"
					className="button"
				>
					Delete
				</button>
			</Form>
		</div>
	);
}
