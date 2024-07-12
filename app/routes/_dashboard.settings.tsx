import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';
import { requireUser } from '~/session.server';

export const loader: LoaderFunction = async ({ request }) => {
	const user = await requireUser(request);

	try {
		await throwError();
	} catch (e) {
		console.log(e);
	}

	return json({ user });
};

export const action: ActionFunction = async ({ request }) => {
	const user = await requireUser(request);

	const formData = await request.formData();
	const email = formData.get('email');
	const firstName = formData.get('firstName');
	const lastName = formData.get('lastName');

	if (
		typeof email !== 'string' ||
		typeof firstName !== 'string' ||
		typeof lastName !== 'string'
	) {
		return json({ message: 'Invalid form fields' });
	}

	const updatedUser = await prisma.user.update({
		where: {
			id: user.id,
		},
		data: {
			email,
			firstName,
			lastName,
		},
	});

	return json({ message: 'User profile updated!', updatedUser });
};

export default function SettingsPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	return (
		<main className="content">
			<div className="wrapper">
				<header>
					<h1 className="headline-h3">Settings Page</h1>
				</header>

				<Form className="flex-form" method="post">
					<div className="input input--50">
						<label htmlFor="first-name">First Name</label>
						<input
							id="first-name"
							name="firstName"
							type="text"
							defaultValue={data.user.firstName}
						/>
					</div>

					<div className="input input--50">
						<label htmlFor="last-name">Last Name</label>
						<input
							id="last-name"
							name="lastName"
							type="text"
							defaultValue={data.user.lastName}
						/>
					</div>

					<div className="input">
						<label htmlFor="email">Email</label>
						<input
							id="email"
							name="email"
							type="text"
							defaultValue={data.user.email}
						/>
					</div>

					<button className="primary button">Save</button>

					{actionData?.message ? (
						<div>{actionData.message}</div>
					) : null}
				</Form>
			</div>
		</main>
	);
}

async function throwError(optionalMessage?: string) {
	let message = optionalMessage ? optionalMessage : 'Uh oh...';
	throw new Error(message);
}
