import { json } from '@remix-run/node';
import { prisma } from '~/db.server';
import { normalizeStateInput } from '~/utils/us-states';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';

export const loader: LoaderFunction = async ({ params }) => {
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

		let title = sample.title ? sample.title : '';

		if (!sample.title && sample.finish) {
			title = sample.finish;
		}

		if (!sample.title && sample.finish && sample.colorAlias) {
			title += ' ';
		}

		if (!sample.title && sample.colorAlias) {
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

export const action: ActionFunction = async ({ request }) => {
	const formData = await request.formData();
	const _action = formData.get('_action');

	switch (_action) {
		case 'pick ticket': {
			const fulfillmentId = formData.get('fulfillmentId');
			const fulfillment = await prisma.fulfillment.findUnique({
				where: { id: fulfillmentId },
				include: {
					order: true,
					lineItems: {
						include: {
							orderLineItem: { include: { sample: true } },
						},
					},
					trackingInfo: true,
				},
			});

			if (!fulfillment) {
				throw json({ error: 'Fulfillment not found' }, { status: 404 });
			}

			const orderDetails = formatOrderDetails(fulfillment); // Use your existing formatOrderDetails function

			const pdfBuffer = await generateFedExLabelPDF(orderDetails);

			return new Response(pdfBuffer, {
				headers: {
					'Content-Type': 'application/pdf',
					'Content-Disposition': 'inline; filename="fedex-label.pdf"',
				},
			});
		}

		default:
			return json({ error: 'Unsupported action' }, { status: 400 });
	}
};

function formatOrderDetails(data: any): string {
	const orderNo = `Order No. ${data.fulfillment.order.name}\n\n`;

	const items = data.fulfillment.lineItems
		.map((item: any) => {
			const sample = item.orderLineItem.sample;
			const vendorProductDescription =
				sample.vendorTitle ||
				`${sample.seriesName} ${sample.finish} ${sample.color}`;
			const productDescription =
				sample.title ||
				`${sample.seriesAlias} ${sample.finish} ${sample.colorAlias}`;
			return `- ${item.orderLineItem.quantity} qty. ${vendorProductDescription} : ${productDescription}`.trim();
		})
		.join('\n');

	const address = data.fulfillment.order.address;
	const abbreviatedState = address.state
		? normalizeStateInput(address.state)
		: '';

	const addressString = [
		address.line1 || '',
		address.line2 || '',
		address.line3 || '',
		address.line4 || '',
		`${address.city || ''}${
			address.city && abbreviatedState ? ', ' : ''
		}${abbreviatedState} ${address.postalCode || ''}`,
	]
		.filter((line) => line.trim() !== '') // Remove any empty lines
		.join('\n');

	const trackingInfo = [
		data.fulfillment.trackingInfo?.number || '',
		data.fulfillment.trackingInfo?.company || '',
	]
		.filter((line) => line.trim() !== '') // Remove any empty lines
		.join('\n');

	return `${orderNo}${items}\n\nShip to\n\n${addressString}\n\n${trackingInfo}`.trim();
}

async function generateFedExLabelPDF(orderDetails: string): Promise<Buffer> {
	// Create a new PDF document with a 4x6 inches size (288x432 points)
	const PDFDocument = require('pdfkit');
	const doc = new PDFDocument({
		size: [288, 432], // 4x6 inches in points (72 points per inch)
		margin: 10, // Small margin to fit the label
	});

	// Add text to the PDF
	doc.font('Helvetica').fontSize(10).text(orderDetails, {
		align: 'left',
		lineGap: 5,
	});

	// Finalize the PDF and return it as a buffer
	doc.end();

	const buffer = await new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = [];
		doc.on('data', (chunk) => chunks.push(chunk));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);
	});

	return buffer;
}
