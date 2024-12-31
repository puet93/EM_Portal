import type { ActionFunctionArgs } from '@remix-run/node';
import { graphqlClient } from '~/utils/shopify.server';

export const action = async ({ params, request }: ActionFunctionArgs) => {

	console.log('SHOPIFY CUSTOMERS CREATION/UPDATE');

	try {
		if (request.method !== 'POST') {
			console.error('Invalid request method:', request.method);
			return new Response('Method Not Allowed', { status: 405 });
		}

		// Extract and parse the request body
		const requestBody = await request.json(); // Use await for asynchronous body parsing

		// Validate the structure of the webhook payload
		if (!requestBody || typeof requestBody !== 'object') {
			console.error('Invalid JSON structure:', requestBody);
			return new Response('Bad Request: Invalid JSON', { status: 400 });
		}

		console.log(requestBody)

		return new Response('Customers webhook received successfully', {
			status: 200,
		});
	} catch (error) {
		console.error('Error processing request:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
};
