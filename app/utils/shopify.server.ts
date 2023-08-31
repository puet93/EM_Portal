import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION, Session } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2023-07';

const {
	SHOPIFY_ACCESS_TOKEN,
	SHOPIFY_API_KEY,
	SHOPIFY_API_SECRET_KEY,
	SHOPIFY_SCOPES,
} = process.env;

if (typeof SHOPIFY_API_SECRET_KEY !== 'string') {
	throw new Error('Could not find secret key.');
}

if (typeof SHOPIFY_SCOPES !== 'string') {
	throw new Error('No scope could be found.');
}

const shop = 'edward-martin-llc.myshopify.com';
const shopify = shopifyApi({
	apiKey: SHOPIFY_API_KEY,
	apiSecretKey: SHOPIFY_API_SECRET_KEY,
	apiVersion: LATEST_API_VERSION,
	scopes: SHOPIFY_SCOPES.split(',').map((scope) => scope.trim()),
	hostName: process.env.NODE_ENV == 'development' ? '127.0.0.1:3000' : shop,
	restResources,
	isEmbeddedApp: false,
});
const sessionId = shopify.session.getOfflineId(shop);
const session = new Session({
	id: sessionId,
	shop,
	state: 'state',
	isOnline: false,
	accessToken: SHOPIFY_ACCESS_TOKEN,
});

export const client = new shopify.clients.Rest({ session });
export const graphqlClient = new shopify.clients.Graphql({ session });
