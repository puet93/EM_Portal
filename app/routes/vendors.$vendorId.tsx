import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';

export const action = async ({ params, request }: ActionArgs) => {
	await requireUserId(request);

	switch (request.method) {
		case 'DELETE':
			const vendorId = params.vendorId;
			const vendor = await prisma.vendor.delete({
				where: { id: vendorId },
			});
			return json({ vendor });
		default:
			return json({ message: 'Method not supported' }, 405);
	}
};

export const loader = async ({ request }: LoaderArgs) => {
	await requireUserId(request);
	const vendors = await prisma.vendor.findMany();
	return json({ vendors });
};
