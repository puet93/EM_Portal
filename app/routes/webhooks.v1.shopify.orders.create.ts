import type { ActionFunctionArgs } from '@remix-run/node';
import { graphqlClient } from '~/utils/shopify.server';

export const action = async ({ params, request }: ActionFunctionArgs) => {

	console.log('SHOPIY ORDER CREATION');

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

		if (requestBody?.company?.id) {
			const query = `{
				company(id: "gid://shopify/Company/${requestBody.company.id}") {
					id
    				name
  				}
			}`

			const companyResponse = await graphqlClient.query({ data: query })
			const companyData = companyResponse?.body?.data?.company;
			
			if (!companyData || typeof companyData !== 'object') {
				console.error('Invalid JSON structure:', companyRequestBody);
				return new Response('Bad Request: Invalid JSON', { status: 400 });
			}

			// Overwrite the company information in the original requestBody
			requestBody.company.name = companyData.name;
		}

		// const url = "https://edwardmartin--uat.sandbox.my.salesforce-sites.com/shopifywebhook/services/apexrest/createorder" // Sandbox
		const url = "https://edwardmartin.my.salesforce-sites.com/shopifywebhook/services/apexrest/createorder" // Production

		await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody),
		});

		return new Response('Order creation webhook received successfully', {
			status: 201,
		});
	} catch (error) {
		console.error('Error processing request:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
};
