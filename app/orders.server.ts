import { prisma } from '~/db.server';

export async function getOrders() {
	const orders = await prisma.order.findMany({
		orderBy: {
			createdAt: 'desc',
		},
	});
	return orders;
}

export async function getOrder(orderId: string) {
	const order = await prisma.order.findUnique({
		where: {
			id: orderId,
		},
		include: {
			items: {
				select: {
					id: true,
					quantity: true,
					product: {
						select: {
							id: true,
							sku: true,
							title: true,
							vendorProduct: true,
						},
					},
				},
			},
		},
	});

	console.log(order);

	order?.items.map((item) => console.log(item));

	return order;
}
