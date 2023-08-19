import type { LoaderArgs } from '@remix-run/node';
import { requireUserId } from '~/session.server';
import { getOrder } from '~/orders.server';

export const loader = async ({ params, request }: LoaderArgs) => {
	await requireUserId(request);

	const orders = await getOrder(params.orderId);

	let size = [384, 192];
	let pages = orders.items;

	if (pages.length === 0) {
		throw new Error();
	}

	const PDFDocument = require('pdfkit');
	const doc = new PDFDocument({ size });
	for (let i = 0; pages.length > i; i++) {
		const label = pages[i];

		if (i === 0) {
			doc.text(label.product.title, 24, 24)
				.text(label.product.sku)
				.text(label.product.vendorProduct.itemNo)
				.text('www.edwardmartin.com');
		} else {
			doc.addPage({ size })
				.text(label.product.title, 24, 24)
				.text(label.product.sku)
				.text(label.product.vendorProduct.itemNo)
				.text('www.edwardmartin.com');
		}
	}
	doc.end();

	return new Response(doc, {
		status: 200,
		headers: { 'Content-Type': 'application/pdf' },
	});
};
