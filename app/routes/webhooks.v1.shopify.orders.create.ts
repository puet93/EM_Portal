import type { ActionFunctionArgs } from '@remix-run/node';

export const action = async ({ params, request }: ActionFunctionArgs) => {

	console.log('SHOPIY ORDER CREATION');

	try {
		if (request.method !== 'POST') {
			console.error('Invalid request method:', request.method);
			return new Response('Method Not Allowed', { status: 405 });
		}

		// Extract and parse the request body
		const requestBody = await request.json(); // Use await for asynchronous body parsing
		// console.log('Request received:', requestBody);
		console.log(JSON.stringify(requestBody));

		// Validate the structure of the webhook payload
		if (!requestBody || typeof requestBody !== 'object') {
			console.error('Invalid JSON structure:', requestBody);
			return new Response('Bad Request: Invalid JSON', { status: 400 });
		}

		// Process the request
		console.log('Processing webhook for order:', requestBody.order_id);

		return new Response('Order updated webhook received successfully', {
			status: 201,
		});
	} catch (error) {
		console.error('Error processing request:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
};
