import type { ActionFunction } from '@remix-run/node';
import { prisma } from '~/db.server';
import { cleanPhoneNumber } from '~/utils/helpers';
import { addTag } from '~/utils/shopify.server';

export const action: ActionFunction = async ({ request }) => {
	const method = request.method;

	// TODO: Authenticate request

	switch (method) {
		case 'POST': {
			let order;
			try {
				const shopifySampleOrder = await request.json();
				order = await createOrder(shopifySampleOrder);
			} catch (e) {
				console.log('ERROR');
				console.log(e);
			}

			if (!order)
				return new Response('Order NOT created', { status: 202 });

			if (order && order.shopifyOrderId) {
				await addTag({
					id: order.shopifyOrderId,
					tag: 'in sample portal',
				});
			}

			return new Response('Order created', { status: 201 });
		}

		default:
			return new Response('Method Not Allowed', { status: 202 });
	}
};

interface ShopifySampleOrder {
	id: string;
	name: string;
	fulfillmentOrders: ShopifyFulfillmentOrder[];
	shippingAddress: ShopifyShippingAddress;
}

interface ShopifyShippingAddress {
	name: string;
	address1: string;
	address2?: string;
	city: string;
	provinceCode: string;
	zip: string;
	phone: string;
}

interface ShopifyFulfillmentOrder {
	id: string;
	assignedLocation: ShopifyAssignedLocation;
	lineItems: ShopifyFulfillmentOrderLineItem[];
}

interface ShopifyFulfillmentOrderLineItem {
	id: string;
	sku: string;
	totalQuantity: string;
}

interface ShopifyAssignedLocation {
	id: string;
	name: string;
}

async function createOrder(shopifySampleOrder: ShopifySampleOrder) {
	const shippingAddress = shopifySampleOrder.shippingAddress;
	const phoneNumber = cleanPhoneNumber(shippingAddress.phone);

	const lineItems: { quantity: number; sku: string }[] =
		shopifySampleOrder.fulfillmentOrders.flatMap((fulfillmentOrder) =>
			fulfillmentOrder.lineItems.map((lineItem) => {
				const quantity = Number(lineItem.totalQuantity);
				if (isNaN(quantity)) {
					throw new Error(
						`Invalid quantity for SKU ${lineItem.sku}: ${lineItem.totalQuantity}`
					);
				}
				return { quantity, sku: lineItem.sku };
			})
		);

	const transactions = await prisma.$transaction(async (tx) => {
		// Create the order, order line items, and fulfillments
		const order = await tx.order.create({
			data: {
				name: shopifySampleOrder.name,
				shopifyOrderId: shopifySampleOrder.id,
				status: 'NEW',
				lineItems: {
					create: lineItems.map((lineItem) => ({
						sample: {
							connect: {
								materialNo: lineItem.sku,
							},
						},
						quantity: lineItem.quantity,
					})),
				},
				fulfillments: {
					create: shopifySampleOrder.fulfillmentOrders.map(
						(fulfillmentOrder, index) => ({
							name: `${shopifySampleOrder.name}-0${index + 1}`,
							shopifyFulfillmentOrderId: fulfillmentOrder.id,
							vendor: {
								connect: {
									shopifyLocationId:
										fulfillmentOrder.assignedLocation.id,
								},
							},
						})
					),
				},
				address: {
					create: {
						line1: shippingAddress.name,
						line2: shippingAddress.address1,
						line3: shippingAddress.address2,
						city: shippingAddress.city,
						state: shippingAddress.provinceCode,
						postalCode: shippingAddress.zip,
						phoneNumber: phoneNumber,
					},
				},
			},
			include: {
				lineItems: {
					include: {
						sample: true,
					},
				},
				fulfillments: true,
			},
		});

		// Add the order line-items as fulfillment line-items to the correct fulfillments
		for (const orderLineItem of order.lineItems) {
			const fulfillment = await tx.fulfillment.findFirst({
				where: {
					orderId: order.id,
					vendorId: orderLineItem.sample.vendorId,
				},
			});

			if (!fulfillment) throw new Error('Unable to find fulfillment!');

			await tx.fulfillmentLineItem.create({
				data: {
					orderLineItemId: orderLineItem.id,
					fulfillmentId: fulfillment.id,
				},
			});
		}

		return order;
	});

	if (!transactions) return;
	return transactions;
}
