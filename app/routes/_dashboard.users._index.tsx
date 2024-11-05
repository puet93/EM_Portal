import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { requireSuperAdmin } from '~/session.server';
import { prisma } from '~/db.server';
import { createUser, getUserByEmail } from '~/models/user.server';
import { validateEmail } from '~/utils';
import { toCapitalCase } from '~/utils/helpers';

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
			orderBy: [
				{ vendorId: 'desc' },
				{ vendor: { name: 'asc' } },
				{ email: 'asc' },
			],
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
							<th className="sr-only">Name</th>
							<th className="sr-only">Email</th>
						</tr>
					</thead>
					<tbody>
						{data.users.map((user) => (
							<tr
								key={user.id}
								className="flex justify-between gap-x-6 py-5"
							>
								<td className="mr-16">
									<Link to={'/users/' + user.id}>
										<p className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
											{user.firstName} {user.lastName}
										</p>

										<p className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500 dark:text-zinc-400">
											{user.email}
										</p>
									</Link>
								</td>
								<td>
									<div className="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
										<p className="text-sm leading-6 text-white">
											{user.vendor?.name
												? user.vendor.name
												: 'Edward Martin'}
										</p>
										<div className="mt-1 flex items-center gap-x-1.5">
											<p className="text-xs leading-5 text-gray-500 dark:text-zinc-400">
												{toCapitalCase(user.role)}
											</p>
										</div>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			) : null}
		</>
	);
}
