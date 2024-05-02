import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';

export const action = async ({ request }: ActionFunctionArgs) => {
	await requireUserId(request);

	if (request.method !== 'POST') {
		return json({ message: 'Method not supported' }, 405);
	}

	const formData = await request.formData();
	const vendorName = formData.get('vendorName');

	if (typeof vendorName !== 'string' || vendorName.length === 0) {
		return json({ message: 'Invalid form input' });
	}

	return json({
		vendor: await prisma.vendor.create({ data: { name: vendorName } }),
	});
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	await requireUserId(request);

	const url = new URL(request.url);
	const name = url.searchParams.get('name');

	if (typeof name === 'string' && name.length !== 0) {
		const vendor = await prisma.vendor.findUnique({ where: { name } });
		return json({ vendor });
	}

	const vendors = await prisma.vendor.findMany();
	return json({ vendors });
};
