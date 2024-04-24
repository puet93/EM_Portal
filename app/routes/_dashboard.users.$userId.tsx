import type { ActionFunction, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { requireSuperAdmin, requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { Role } from '@prisma/client';
import Dropdown from '~/components/Dropdown';
import Input from '~/components/Input';

export const loader = async ({ params, request }: LoaderArgs) => {
	await requireUserId(request);

	const [user, vendors] = await prisma.$transaction([
		prisma.user.findUnique({ where: { id: params.userId } }),
		prisma.vendor.findMany(),
	]);

	const vendorOptions = vendors.map((vendor) => ({
		value: vendor.id,
		label: vendor.name,
	}));

	return json({ user, vendorOptions });
};

export const action: ActionFunction = async ({ params, request }) => {
	await requireSuperAdmin(request);

	const formData = await request.formData();
	const { ...values } = Object.fromEntries(formData);

	await prisma.user.update({
		where: {
			id: params.userId,
		},
		data: values,
	});

	return json({ success: true, message: 'User role updated!' });
};

export default function UserPage() {
	const actionData = useActionData<typeof action>();
	const data = useLoaderData<typeof loader>();
	const options = [
		{ value: 'SUPERADMIN', label: 'Superadmin' },
		{ value: 'ADMIN', label: 'Admin' },
		{ value: 'USER', label: 'User' },
	];

	return (
		<div className="content-wrapper">
			<header>
				{data.user ? (
					<h1 className="headline-h3">
						{data.user.firstName && data.user.lastName
							? data.user.firstName + ' ' + data.user.lastName
							: data.user.email}
					</h1>
				) : (
					<h1 className="headline-h3">User not found</h1>
				)}
			</header>

			<Form method="post" className="flex-form">
				<Input
					className="input input--50"
					name="firstName"
					id="first-name"
					label="First Name"
					defaultValue={data.user?.firstName || undefined}
				/>

				<Input
					className="input input--50"
					name="lastName"
					id="last-name"
					label="Last Name"
					defaultValue={data.user?.lastName || undefined}
				/>

				<Dropdown
					name="role"
					options={options}
					defaultValue={data.user?.role || undefined}
				/>

				<Dropdown
					name="vendorId"
					options={data.vendorOptions}
					defaultValue={data.user?.vendorId || undefined}
				/>

				{actionData?.formError ? (
					<div className="error message">{actionData.formError}</div>
				) : null}

				{actionData?.success && actionData.message ? (
					<div className="success message">{actionData.message}</div>
				) : null}

				<button type="submit" className="primary button">
					Update
				</button>
			</Form>
		</div>
	);
}
