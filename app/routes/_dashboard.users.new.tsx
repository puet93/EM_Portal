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
import { fakeAysncRequest } from '~/utils/faker.server';

export const loader = async ({ request }: LoaderArgs) => {
	await requireSuperAdmin(request);
	return json({});
};

export const action: ActionFunction = async ({ request }) => {
	await requireSuperAdmin(request);

	const formData = await request.formData();

	const _action = formData.get('_action');

	switch (_action) {
		case 'test': {
			let message = await fakeAysncRequest('Why, hello there.', 2000);

			return json({ message });
		}
		default: {
			console.log('THIS SHOULD NOT FIRE');
			break;
		}
	}

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
	return redirect('/users');
};

export default function NewUserPage() {
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();

	const isActionSubmission = navigation.state === 'submitting';

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

			<Form method="post">
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
			</Form>
		</div>
	);
}
