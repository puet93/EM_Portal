import type { ActionFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { requireSuperAdmin, requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { Button } from '~/components/Buttons';
import { Input, Select } from '~/components/Input';

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
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
	let { role, vendorId, ...values } = Object.fromEntries(formData);

	const updateData = { ...values };
	updateData.role = role;

	if (role === 'SUPERADMIN' || !vendorId) {
		updateData.vendor = {
			disconnect: true, // Always disconnect vendor if role is SUPERADMIN
		};
	} else {
		updateData.vendor = {
			connect: { id: vendorId },
		};
	}

	await prisma.user.update({
		where: {
			id: params.userId,
		},
		data: updateData,
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
		<div className="wrapper">
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

			<Form method="post" className="grid grid-cols-6 gap-6">
				<div className="col-span-3">
					<Input
						name="firstName"
						id="first-name"
						label="First Name"
						defaultValue={data.user?.firstName || undefined}
					/>
				</div>

				<div className="col-span-3">
					<Input
						name="lastName"
						id="last-name"
						label="Last Name"
						defaultValue={data.user?.lastName || undefined}
					/>
				</div>

				<div className="col-span-full">
					<Select
						id="role"
						name="role"
						options={options}
						defaultValue={data.user?.role || undefined}
					/>
				</div>

				<div className="col-span-full">
					<Select
						id="vendorId"
						name="vendorId"
						options={data.vendorOptions}
						defaultValue={data.user?.vendorId || undefined}
						hasBlankOption
					/>
				</div>

				{actionData?.formError ? (
					<div className="error message">{actionData.formError}</div>
				) : null}

				{actionData?.success && actionData.message ? (
					<div className="success message">{actionData.message}</div>
				) : null}

				<Button type="submit" color="primary">
					Update
				</Button>
			</Form>
		</div>
	);
}
