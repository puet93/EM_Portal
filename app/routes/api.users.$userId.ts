import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';

export const action = async ({ params, request }: ActionArgs) => {
	await requireUserId(request);

	const userId = params.userId;
	const formData = await request.formData();
	const { ...values } = Object.fromEntries(formData);

	switch (request.method) {
		case 'PUT':
			return json({
				user: await prisma.user.update({
					where: { id: userId },
					data: { ...values },
				}),
			});
		case 'DELETE':
			return json({
				user: await prisma.user.delete({
					where: { id: userId },
				}),
			});
		default:
			return json(
				{ errors: { message: 'Request method invalid' } },
				{ status: 405 }
			);
	}
};
