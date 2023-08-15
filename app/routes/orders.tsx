import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';

export const loader = async ({ request }: LoaderArgs) => {
	await requireUserId(request);

	return json({ orders: 'Hello World!' });
};

export default function OrdersPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div>
			<h1>Orders</h1>

			{data.orders ?? (
				<ul>
					<li>Here is an order.</li>
				</ul>
			)}
		</div>
	);
}
