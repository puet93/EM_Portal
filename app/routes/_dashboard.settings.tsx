import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { requireUser } from '~/session.server';

export const loader: LoaderFunction = async ({ request }) => {
	const user = await requireUser(request);

	return json({ user });
};

export default function SettingsPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<main className="dashboard-content">
			<header>
				<h1>Settings Page</h1>
			</header>

			<Form method="post">
				<div className="input">
					<label htmlFor="email">Email</label>
					<input
						id="email"
						name="email"
						type="text"
						value={data.user.email}
					/>
				</div>

				<div className="input">
					<label htmlFor="first-name">First Name</label>
					<input
						id="first-name"
						name="firstName"
						type="text"
						value={data.user.firstName}
					/>
				</div>

				<div className="input">
					<label htmlFor="last-name">Last Name</label>
					<input
						id="last-name"
						name="lastName"
						type="text"
						value={data.user.lastName}
					/>
				</div>
			</Form>
		</main>
	);
}
