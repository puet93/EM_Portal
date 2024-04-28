import type { LoaderArgs } from '@remix-run/node';
import { prisma } from '~/db.server';

export const loader = async ({ params, request }: LoaderArgs) => {
	// await requireUserId(request);

	const fulfillment = await prisma.fulfillment.findUnique({
		where: { id: params.fulfillmentId },
		include: {
			order: true,
			lineItems: {
				include: {
					orderLineItem: {
						include: {
							sample: true,
						},
					},
				},
			},
		},
	});

	let size = [384, 192];
	let pages = fulfillment?.lineItems;

	if (!pages || pages.length === 0) {
		throw new Error('Nothing to print');
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
		const label = pages[i].orderLineItem;
		const sample = pages[i].orderLineItem?.sample;

		if (!sample) {
			throw new Error('Unable to location sample swatch');
		}

		let title = '';

		if (sample.finish) {
			title = sample.finish;
		}

		if (sample.finish && sample.colorAlias) {
			title += ' ';
		}

		if (sample.colorAlias) {
			title += sample.colorAlias;
		}

		if (i === 0) {
			// If first page

			// If first page quantity is more than 1
			if (label.quantity !== 1) {
				const firstPage = label.quantity;

				for (var j = label.quantity; j > 0; j--) {
					if (j === firstPage) {
						doc.fontSize(16).text(title, 24, 24, {
							width: 336,
						});

						doc.fontSize(12)
							.moveDown(0.25)
							.text(sample.seriesAlias);

						doc.fontSize(11).text(sample.materialNo, 192, 158, {
							width: 168,
							align: 'right',
						});

						doc.fontSize(12).text('www.edwardmartin.com', 24, 158, {
							width: 168,
							align: 'left',
						});
					} else {
						doc.addPage(pageOptions)
							.fontSize(16)
							.text(title, 24, 24, { width: 336 });

						doc.fontSize(12)
							.moveDown(0.25)
							.text(sample.seriesAlias);

						doc.fontSize(11).text(sample.materialNo, 192, 158, {
							width: 168,
							align: 'right',
						});

						doc.fontSize(12).text('www.edwardmartin.com', 24, 158, {
							width: 168,
							align: 'left',
						});
					}
				}
			} else {
				doc.fontSize(16).text(title, 24, 24, {
					width: 336,
				});

				doc.fontSize(12).moveDown(0.25).text(sample.seriesAlias);

				doc.fontSize(11).text(sample.materialNo, 192, 158, {
					width: 168,
					align: 'right',
				});

				doc.fontSize(12).text('www.edwardmartin.com', 24, 158, {
					width: 168,
					align: 'left',
				});
			}
		} else {
			for (var j = label.quantity; j > 0; j--) {
				doc.addPage(pageOptions).fontSize(16).text(title, 24, 24, {
					width: 336,
				});

				doc.fontSize(12).moveDown(0.25).text(sample.seriesAlias);

				doc.fontSize(11).text(sample.materialNo, 192, 158, {
					width: 168,
					align: 'right',
				});

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
