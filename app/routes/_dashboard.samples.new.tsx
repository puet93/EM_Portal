import type { ActionFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { Form } from '@remix-run/react';
import { prisma } from '~/db.server';
import { requireUserId } from '~/session.server';
import { Input } from '~/components/Input';

export const action: ActionFunction = async ({ request }) => {
	await requireUserId(request);

	const formData = await request.formData();
	const data = Object.fromEntries(formData);

	await prisma.sample.create({
		data: data,
	});

	return redirect('..');
};

export default function SamplesPage() {
	return (
		<div>
			<h1 className="headline-h3">Create New Sample</h1>

			<Form method="post" replace>
				<Input label="Series" id="series" name="seriesName" />

				<Input label="Color" id="color" name="color" />

				<Input label="Finish" id="finish" name="finish" />

				<Input
					label="Material No."
					id="material-number"
					name="materialNo"
				/>

				<Input
					label="Series Alias"
					id="series-alias"
					name="seriesAlias"
				/>

				<Input label="Color Alias" id="color-alias" name="colorAlias" />

				<button type="submit" className="primary button">
					Save
				</button>
			</Form>

			{/* {actionData && actionData.empty?.length === 0 ? (
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
			) : null} */}

			{/* <div className="table-toolbar">
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
			</div> */}
		</div>
	);
}
