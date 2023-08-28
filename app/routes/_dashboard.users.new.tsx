import type { ActionArgs, ActionFunction, LoaderArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form } from '@remix-run/react';
import { requireUserId, requireSuperAdmin } from '~/session.server';
import {
	createUser,
	createSuperAdmin,
	getUserByEmail,
} from '~/models/user.server';
import { validateEmail } from '~/utils';

export const loader = async ({ request }: LoaderArgs) => {
	await requireSuperAdmin(request);
	return json({});
};

export const action: ActionFunction = async ({ request }) => {
	await requireSuperAdmin(request);

	const formData = await request.formData();
	const firstName = formData.get('firstName');
	const email = formData.get('email');
	const password = formData.get('password');

	if (typeof firstName !== 'string' && firstName !== 'applesauce') {
		return redirect('/users');
	}

	if (typeof email !== 'string' || typeof password !== 'string') {
		return redirect('/users');
	}

	const user = await createSuperAdmin(email, password);

	console.log('USER', user);

	return redirect('/users');
};

export default function NewUserPage() {
	return (
		<div className="content-wrapper">
			<header>
				<h1 className="headline-h3">Create User</h1>
			</header>
			<Form method="post" className="flex-form">
				<div className="input input--50">
					<label htmlFor="first-name">First Name</label>
					<input type="text" name="firstName" id="first-name" />
				</div>

				<div className="input input--50">
					<label htmlFor="last-name">Last Name</label>
					<input type="text" name="lastName" id="last-name" />
				</div>

				<div className="input">
					<label htmlFor="email">Email</label>
					<input type="email" name="email" id="email" />
				</div>

				<div className="input input--50">
					<label htmlFor="password">Password</label>
					<input type="text" name="password" id="password" />
				</div>

				<div className="input input--50">
					<label htmlFor="confirm-password">Confirm Password</label>
					<input
						type="password"
						name="confirmPassword"
						id="confirm-password"
					/>
				</div>

				<button type="submit" className="primary button">
					Create User
				</button>
			</Form>
		</div>
	);
}
