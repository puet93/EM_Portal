import type { ActionFunction, LoaderArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useActionData, useNavigation } from '@remix-run/react';
import { requireUserId, requireSuperAdmin } from '~/session.server';
import {
	createUser,
	createSuperAdmin,
	getUserByEmail,
} from '~/models/user.server';
import { validateEmail } from '~/utils';
import { fakeAsyncRequest } from '~/utils/faker.server';
import { badRequest } from '~/utils/request.server';

// TODO: Move to user.server and then refactor user.server
import { prisma } from '~/db.server';
import bcrypt from 'bcryptjs';

export const loader = async ({ request }: LoaderArgs) => {
	await requireSuperAdmin(request);
	return json({});
};

export const action: ActionFunction = async ({ request }) => {
	await requireSuperAdmin(request);

	const formData = await request.formData();
	const { _action, ...entries } = Object.fromEntries(formData);

	switch (_action) {
		case 'create': {
			const errors: {
				firstName?: string;
				lastName?: string;
				email?: string;
				password?: string;
			} = {};

			const firstName = String(entries.firstName);
			const lastName = String(entries.lastName);
			const email = String(entries.email);
			const password = String(entries.password);
			const confirmPassword = String(entries.confirmPassword);

			// Validate first name
			if (typeof firstName !== 'string' || firstName.length === 0) {
				errors.firstName = 'Please provide a first name';
			}

			// // Validate last name
			if (typeof lastName !== 'string' || lastName.length === 0) {
				errors.lastName = 'Please provide a last name';
			}

			// Validate email
			if (!validateEmail(email)) {
				errors.email = 'Email is invalid';
			}

			// Check for existing user
			const existingUser = await getUserByEmail(email);
			if (existingUser) {
				errors.email = 'A user with this email already exists';
			}

			// Validate password
			if (typeof password !== 'string' || password.length === 0) {
				errors.password = 'Password is required';
			}

			if (password.length < 8) {
				errors.password = 'Password is too short';
			}

			if (password !== confirmPassword) {
				errors.password = 'Passwords do not match';
			}

			// If errors, return errors
			if (Object.keys(errors).length !== 0) {
				return badRequest({ errors });
			}

			// Create user
			await prisma.user.create({
				data: {
					firstName,
					lastName,
					email,
					password: {
						create: {
							hash: await bcrypt.hash(password, 10),
						},
					},
				},
			});

			return redirect('/users');
		}
		case 'test': {
			return json({
				message: await fakeAsyncRequest('Why, hello there.', 2000),
			});
		}
		default: {
			return badRequest({ message: 'Invalid request action.' });
		}
	}
};

export default function NewUserPage() {
	const actionData = useActionData<typeof action>();

	// const navigation = useNavigation();
	// const isActionSubmission = navigation.state === 'submitting';

	return (
		<div className="content-wrapper">
			<header>
				<h1 className="headline-h3">Create User</h1>
			</header>

			<Form method="post" className="flex-form" autoComplete="off">
				<div className="input input--50">
					<label htmlFor="first-name">First Name</label>
					<input
						type="text"
						name="firstName"
						id="first-name"
						autoFocus
					/>

					{actionData?.errors?.firstName ? (
						<div className="error message">
							{actionData.errors.firstName}
						</div>
					) : null}
				</div>

				<div className="input input--50">
					<label htmlFor="last-name">Last Name</label>
					<input type="text" name="lastName" id="last-name" />

					{actionData?.errors?.lastName ? (
						<div className="error message">
							{actionData.errors.lastName}
						</div>
					) : null}
				</div>

				<div className="input">
					<label htmlFor="email">Email</label>
					<input type="email" name="email" id="email" />

					{actionData?.errors?.email ? (
						<div className="error message">
							{actionData.errors.email}
						</div>
					) : null}
				</div>

				<div className="input input--50">
					<label htmlFor="password">Password</label>
					<input type="password" name="password" id="password" />

					{actionData?.errors?.password ? (
						<div className="error message">
							{actionData.errors.password}
						</div>
					) : null}
				</div>

				<div className="input input--50">
					<label htmlFor="confirm-password">Confirm Password</label>
					<input
						type="password"
						name="confirmPassword"
						id="confirm-password"
					/>
				</div>

				<button
					name="_action"
					value="create"
					type="submit"
					className="primary button"
				>
					Create User
				</button>
			</Form>

			{/* <Form method="post">
				<button
					type="submit"
					className="button"
					name="_action"
					value="test"
				>
					{isActionSubmission ? 'Loading...' : 'Submit'}
				</button>

				{actionData?.message ? (
					<div className="success message">{actionData.message}</div>
				) : null}
			</Form> */}
		</div>
	);
}
