export async function getOrders() {
	const orders = [{ id: '12345' }, { id: '67890' }];
	return orders;
}

export async function getOrder(orderId: string) {
	const lineItems = [
		{
			title: 'Atmosphere 2x2 Matte Porcelain Mosaic Tile in Natural',
			sku: '10114',
			vendorProductId: '1096164',
		},
		{
			title: 'Atmosphere 2x2 Matte Porcelain Mosaic Tile in Dune',
			sku: '10115',
			vendorProductId: '1096165',
		},
		{
			title: 'Atmosphere 2x2 Matte Porcelain Mosaic Tile in Graphite',
			sku: '10116',
			vendorProductId: '1096166',
		},
		{
			title: 'Atmosphere 2x2 Matte Porcelain Mosaic Tile in Taupe',
			sku: '10117',
			vendorProductId: '1096167',
		},
		{
			title: 'Atmosphere 2x2 Matte Porcelain Mosaic Tile in Dusk',
			sku: '10118',
			vendorProductId: '1096168',
		},
		{
			title: 'Timeless 24x24 Matte Porcelain Tile in Amani Bronze',
			sku: '10526',
			vendorProductId: '1100468',
		},
	];

	return {
		id: orderId,
		lineItems,
	};
}
