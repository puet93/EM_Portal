import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';

export const action = async ({ params, request }: ActionArgs) => {
	await requireUserId(request);

	if (request.method !== 'DELETE') {
		return json(
			{ errors: { message: 'Request method invalid' } },
			{ status: 405 }
		);
	}

	return json({
		user: await prisma.user.delete({ where: { id: params.userId } }),
	});
};
