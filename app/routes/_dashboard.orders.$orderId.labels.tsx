import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireUserId } from '~/session.server';
import { getOrder } from '~/orders.server';

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	await requireUserId(request);

	const orders = await getOrder(params.orderId);

	let size = [384, 192];
	let pages = orders.items;

	if (pages.length === 0) {
		throw new Error();
	}

	const pageOptions = {
		size,
		margins: {
			top: 24,
			bottom: 0,
			left: 24,
			right: 24,
		},
	};
	const PDFDocument = require('pdfkit');
	const doc = new PDFDocument(pageOptions);
	for (let i = 0; pages.length > i; i++) {
		const label = pages[i];

		if (i === 0) {
			// If first page

			// If first page quantity is more than 1
			if (label.quantity !== 1) {
				const firstPage = label.quantity;

				for (var j = label.quantity; j > 0; j--) {
					if (j === firstPage) {
						doc.fontSize(16).text(label.product.title, 24, 24, {
							width: 336,
						});

						doc.fontSize(12)
							.moveDown(0.25)
							.text(`SKU: ${label.product.sku}`);

						doc.fontSize(11).text(
							label.product.vendorProduct.sample.materialNo,
							192,
							158,
							{
								width: 168,
								align: 'right',
							}
						);

						doc.fontSize(12).text('www.edwardmartin.com', 24, 158, {
							width: 168,
							align: 'left',
						});
					} else {
						doc.addPage(pageOptions)
							.fontSize(16)
							.text(label.product.title, 24, 24, { width: 336 });

						doc.fontSize(12)
							.moveDown(0.25)
							.text(`SKU: ${label.product.sku}`);

						doc.fontSize(11).text(
							label.product.vendorProduct.sample.materialNo,
							192,
							158,
							{
								width: 168,
								align: 'right',
							}
						);

						doc.fontSize(12).text('www.edwardmartin.com', 24, 158, {
							width: 168,
							align: 'left',
						});
					}
				}
			} else {
				doc.fontSize(16).text(label.product.title, 24, 24, {
					width: 336,
				});

				doc.fontSize(12)
					.moveDown(0.25)
					.text(`SKU: ${label.product.sku}`);

				doc.fontSize(11).text(
					label.product.vendorProduct.sample.materialNo,
					192,
					158,
					{
						width: 168,
						align: 'right',
					}
				);

				doc.fontSize(12).text('www.edwardmartin.com', 24, 158, {
					width: 168,
					align: 'left',
				});
			}
		} else {
			for (var j = label.quantity; j > 0; j--) {
				doc.addPage(pageOptions)
					.fontSize(16)
					.text(label.product.title, 24, 24, { width: 336 });

				doc.fontSize(12)
					.moveDown(0.25)
					.text(`SKU: ${label.product.sku}`);

				doc.fontSize(11).text(
					label.product.vendorProduct.sample.materialNo,
					192,
					158,
					{
						width: 168,
						align: 'right',
					}
				);

				doc.fontSize(12).text('www.edwardmartin.com', 24, 158, {
					width: 168,
					align: 'left',
				});
			}
		}
	}
	doc.end();

	return new Response(doc, {
		status: 200,
		headers: { 'Content-Type': 'application/pdf' },
	});
};
