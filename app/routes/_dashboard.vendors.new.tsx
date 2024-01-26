import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, Form, useActionData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';

import Input from '~/components/Input';

export const action = async ({ request }: ActionArgs) => {
	await requireUserId(request);

	if (request.method !== 'POST') {
		return json({ message: 'Method not supported' }, 405);
	}

	const formData = await request.formData();
	const vendorName = formData.get('vendorName');

	if (typeof vendorName !== 'string' || vendorName.length === 0) {
		return json({ message: 'Invalid form input' });
	}

	return json({
		vendor: await prisma.vendor.create({ data: { name: vendorName } }),
	});
};

export const loader = async ({ request }: LoaderArgs) => {
	await requireUserId(request);
	return json({});
};

export default function VendorsPage() {
	// const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	return (
		<>
			<header>
				<h1 className="headline-h3">Create New Vendor</h1>
			</header>

			<Form method="post">
				<Input label="Vendor name" id="vendorName" name="vendorName" />
				<button type="submit">Create</button>
			</Form>

			{actionData && actionData.vendor ? (
				<div className="success message">Vendor created.</div>
			) : null}
		</>
	);
}
