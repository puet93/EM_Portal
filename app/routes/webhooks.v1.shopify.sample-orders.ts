import { json } from '@remix-run/node';
import type { ActionFunction } from '@remix-run/node';

export const action: ActionFunction = async ({ request }) => {
	const method = request.method;

	// TODO: Add authentication

	switch (method) {
		case 'POST': {
			console.log('REQUEST FROM SHOPIFY');

			try {
				const body = await request.json();
				console.log(body);
				body.fulfillmentOrders.forEach((order) => {
					order.lineItems.forEach((lineItem) => {
						console.log(lineItem);
					});
				});
			} catch (e) {
				console.log('ERROR');
				console.log(e);
			}

			return new Response('Order created', { status: 201 });
		}

		default:
			return new Response('Method Not Allowed', { status: 202 });
	}
};
