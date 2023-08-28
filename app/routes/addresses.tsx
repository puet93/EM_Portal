import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';
import { TrashIcon } from '~/components/Icons';

export const loader: LoaderFunction = async ({ request }) => {
	const addresses = await prisma.address.findMany({});
	return json({ addresses });
};

export const action: ActionFunction = async ({ request }) => {
	const formData = await request.formData();
	const action = formData.get('_action');
	const addressId = formData.get('addressId');

	if (typeof action !== 'string' || typeof addressId !== 'string') {
		return json({});
	}

	const address = await prisma.address.delete({
		where: { id: addressId },
		include: {
			orders: true,
		},
	});
	return json({ address });
};

export default function AddressesPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<ul>
			{data.addresses.map((address) => (
				<li key={address.id}>
					<Form method="post">
						<input
							type="hidden"
							name="addressId"
							value={address.id}
						/>
						<button
							className="destructive button"
							name="_action"
							value="delete"
						>
							<TrashIcon />
							Delete
						</button>
					</Form>
				</li>
			))}
		</ul>
	);
}
