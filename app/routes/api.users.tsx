import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { createUser, getUserByEmail } from '~/models/user.server';
import { validateEmail } from '~/utils';

export const action = async ({ request }: ActionArgs) => {
	await requireUserId(request);

	if (request.method !== 'POST') {
		return json(
			{ errors: { message: 'Request method invalid' } },
			{ status: 405 }
		);
	}

	const formData = await request.formData();
	const email = formData.get('email');
	const password = formData.get('password');

	if (!validateEmail(email)) {
		return json(
			{ errors: { email: 'Email is invalid', password: null } },
			{ status: 400 }
		);
	}

	if (typeof password !== 'string' || password.length === 0) {
		return json(
			{
				errors: {
					email: null,
					password: 'Password is required',
				},
			},
			{ status: 400 }
		);
	}

	if (password.length < 8) {
		return json(
			{
				errors: {
					email: null,
					password: 'Password is too short',
				},
			},
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

	return json({ user: await createUser(email, password) });
};

export const loader = async ({ request }: LoaderArgs) => {
	await requireUserId(request);
	return json({ users: await prisma.user.findMany() });
};
