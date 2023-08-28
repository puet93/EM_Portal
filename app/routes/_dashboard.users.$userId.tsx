import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { createUser, getUserByEmail } from '~/models/user.server';
import { validateEmail } from '~/utils';
import { useLoaderData } from '@remix-run/react';

export const loader = async ({ params, request }: LoaderArgs) => {
	await requireUserId(request);

	return json({
		user: await prisma.user.findUnique({ where: { id: params.userId } }),
	});
};

export default function UserPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div className="content-wrapper">
			<header>
				{data.user ? (
					<h1 className="headline-h3">
						{data.user.firstName && data.user.lastName
							? data.user.firstName + ' ' + data.user.lastName
							: data.user.email}
					</h1>
				) : (
					<h1 className="headline-h3">User not found</h1>
				)}
			</header>
		</div>
	);
}
