import type { ActionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { createSuperAdmin, getUserByEmail } from '~/models/user.server';
import { createUserSession } from '~/session.server';
import { safeRedirect, validateEmail } from '~/utils';

export const action = async ({ request }: ActionArgs) => {
	const formData = await request.formData();
	const email = formData.get('email');
	const password = formData.get('password');
	const redirectTo = safeRedirect(formData.get('redirectTo'), '/');

	if (!validateEmail(email)) {
		return json(
			{ errors: { email: 'Email is invalid', password: null } },
			{ status: 400 }
		);
	}

	if (typeof password !== 'string' || password.length === 0) {
		return json(
			{ errors: { email: null, password: 'Password is required' } },
			{ status: 400 }
		);
	}

	if (password.length < 8) {
		return json(
			{ errors: { email: null, password: 'Password is too short' } },
			{ status: 400 }
		);
	}

	const existingUser = await getUserByEmail(email);
	if (existingUser) {
		return json(
			{
				errors: {
					email: 'A user already exists with this email',
					password: null,
				},
			},
			{ status: 400 }
		);
	}

	if (email === 'eddytseng@icloud.com' && password === 'applesauce') {
		const user = await createSuperAdmin(
			'eddy.tseng@edwardmartin.com',
			'eddyrules'
		);

		return createUserSession({
			redirectTo,
			remember: false,
			request,
			userId: user.id,
		});
	}

	return new Error('Unable to join.');
};
