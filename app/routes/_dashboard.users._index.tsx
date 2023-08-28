import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { createUser, getUserByEmail } from '~/models/user.server';
import { validateEmail } from '~/utils';
import { useLoaderData } from '@remix-run/react';

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
	return json({
		users: await prisma.user.findMany({
			orderBy: { email: 'asc' },
		}),
	});
};

export default function UserPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div className="content-wrapper">
			<header>
				<h1 className="headline-h3">Users</h1>
				<Link to="new" className="primary button">
					Create New User
				</Link>
			</header>

			{data.users ? (
				<ul>
					{data.users.map((user) => (
						<li key={user.id}>
							<Link to={'/users/' + user.id}>{user.email}</Link>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
