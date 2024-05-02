import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { requireSuperAdmin } from '~/session.server';
import { prisma } from '~/db.server';
import { createUser, getUserByEmail } from '~/models/user.server';
import { validateEmail } from '~/utils';

export const action = async ({ request }: ActionFunctionArgs) => {
	await requireSuperAdmin(request);

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

export const loader = async ({ request }: LoaderFunctionArgs) => {
	await requireSuperAdmin(request);

	return json({
		users: await prisma.user.findMany({
			orderBy: { email: 'asc' },
			include: {
				vendor: {
					select: {
						name: true,
					},
				},
			},
		}),
	});
};

export default function UserPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<>
			<header className="page-header">
				<div className="page-header__row">
					<h1 className="headline-h3">Users</h1>

					<div className="page-header__actions">
						<Link to="new" className="primary button">
							Create New User
						</Link>
					</div>
				</div>
			</header>

			{data.users ? (
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Email</th>
						</tr>
					</thead>
					<tbody>
						{data.users.map((user) => (
							<tr key={user.id}>
								<td>
									<Link to={'/users/' + user.id}>
										<p className="title">
											{user.firstName} {user.lastName}
										</p>
										<p className="caption">
											{user.vendor?.name}
										</p>
									</Link>
								</td>
								<td>{user.email}</td>
							</tr>
						))}
					</tbody>
				</table>
			) : null}
		</>
	);
}
