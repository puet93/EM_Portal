import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION, Session } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2024-01';

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

export const getMetafields = () => {
	// How the value in dimensions should look like: {\"value\":24.0,\"unit\":\"INCHES\"}"
	const metafieldKeys = {
		width: {
			key: 'custom.width',
			type: 'dimension',
		},

		length: {
			key: 'custom.length',
			type: 'dimension',
		},

		thickness: {
			key: 'custom.thickness',
			type: 'dimension',
		},

		finish: {
			key: 'custom.finish',
			type: 'single_line_text_field',
		},

		material: {
			key: 'filters.material',
			type: 'list.single_line_text_field',
		},

		look: {
			key: 'filters.look',
			type: 'list.single_line_text_field',
		},

		// The given name of the color of the product (e.g. Ocean, Burnt Coffee, etc.)
		color: {
			key: 'custom.variation_value',
			type: 'single_line_text_field',
		},

		// The color family or common color name of the product (e.g. black, white, blue, brown, beige, etc.)
		colorBasic: {
			key: 'filters.color_basic',
			type: 'list.single_line_text_field',
		},

		// The price per unit of measure of the selling unit (e.g. the "$3.99' in  '$3.99 per square feet')
		basePrice: {
			key: 'unit.price',
			type: 'money',
		},

		// baseUom - the base unit of measure of the selling unit (e.g. the 'sq ft' in '$3.99 per sq ft')
		baseUom: {
			key: 'unit.measure',
			type: 'single_line_text_field',
		},

		// The number "16.00" in "16.00 sq ft per box"
		sellingMeasurementValue: {
			key: 'unit.per_sales_unit',
			type: 'number_decimal',
		},
	};

	return metafieldKeys;
};

export const fetchOrderByName = async (name: string) => {
	// In Shopify, the name refers to the order number (e.g. #2002)

	let queryString = `
		query fetchOrderByName {
			orders(first: 1, query: "name:${name}") {
				nodes {
					name
					shippingAddress {
						name
						address1
						address2
						city
						province
						zip
					}
					lineItems(first: 100) {
						nodes {
							title
							quantity
							sku
						}
					}
				}
			}
		}
	`;

	const response = await graphqlClient.query({
		data: queryString,
	});

	let orders = response.body?.data?.orders.nodes; // Can be []
	let order; // undefined

	if (orders.length > 0) {
		order = orders[0];
		console.log('ORDER', order);
	} else {
		console.log('ORDER NOT FOUND');
		return;
	}

	if (order) {
		let lineItems; // undefined
		if (order.lineItems.nodes && order.lineItems.nodes.length > 0) {
			lineItems = order.lineItems.nodes;
		}
		order = { ...order, lineItems };
		return order;
	} else {
		return;
	}
};

export async function createShopifyProductFromSample(
	title: String,
	materialNo: String
) {
	const response = await graphqlClient.query({
		data: `
			mutation productCreate {
				productCreate(input: {
					title: "${title}",
					status: DRAFT,
					tags: ["sample"],
					templateSuffix: "sample",
					variants: [{ 
						sku: "${materialNo}", 
						price: "1.00", 
						weight: 0.5,
						weightUnit: POUNDS,
					}]
				}) {
					product {
						id
						title
						tags
						status
						vendor
						templateSuffix
						variants(first: 1) {
							edges {
								node {
									id
									title
								}
							}
						}
					}
					userErrors {
						field
						message
					}
				}
			}
		`,
	});

	return response.body.data.productCreate.product;
}
