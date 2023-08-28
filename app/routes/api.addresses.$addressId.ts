import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { prisma } from '~/db.server';

export const loader: LoaderFunction = async ({ params, request }) => {
	const address = await prisma.address.findUnique({
		where: {
			id: params.addressId,
		},
	});
	return json({ ...address });
};

export const action: ActionFunction = async ({ params, request }) => {
	const addressId = params.addressId;
	const formData = await request.formData();
	const { ...values } = Object.fromEntries(formData);

	if (typeof addressId !== 'string') {
		return json({ error: 'Invalid address id' });
	}

	await prisma.address.update({
		where: { id: addressId },
		data: values,
	});

	return json(null);
};
