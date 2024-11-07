import { prisma } from '~/db.server';
import type { LoaderFunction } from '@remix-run/node';
import { requireUserId } from '~/session.server';

export const loader: LoaderFunction = async ({ params, request }) => {
	await requireUserId(request);

	// Fetch fulfillment
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
	if (!fulfillment) throw new Error('Unable to find fulfillment');

	// Creates document
	const { default: PDFDocument } = await import('pdfkit');
	const doc = new PDFDocument({ size: [384, 192], margins: { top: 24, bottom: 0, left: 24, right: 24 }});
	let isFirstPage = true;

	// Generate label details on each page
	const generateLabelDetails = (doc, title, orderName, materialNo) => {
		doc
			.fontSize(16)
			.text(title, 24, 24, { width: 336 })
			.fontSize(11)
			.moveDown(0.25)
			.text(materialNo)
			.fontSize(11)
			.text('www.edwardmartin.com', 24, 158, { width: 168, align: 'left' })
			.fontSize(11)
			.text(orderName, 192, 158, { width: 168, align: 'right' })
	}

	// Generate labels for a line item
	const generateLabelsForLineItem = (label, title, orderName, materialNo) => {
		for (let j = 0; j < label.quantity; j++) {
			if(!isFirstPage || j > 0) {
				doc.addPage(pageOptions);
			}
			generateLabelDetails(doc, title, orderName, materialNo);
		}
	}

	// Loop through each line item and create a document
	fulfillment.lineItems.forEach((lineItem) => {
		const label = lineItem.orderLineItem;
		const sample = label?.sample;
		if (!sample) throw new Error('Unable to locate sample swatch');

		// Construct title from sample properties
		let title = sample.title ? sample.title : '';
		if (title === '') {
			console.log('GENERATING TITLE')
			title = [sample.seriesAlias, sample.title, sample.finish, sample.colorAlias].filter(Boolean).join(' ');
		}
		
		// Generate labels for the line item
		generateLabelsForLineItem(label, title, fulfillment.order.name, sample.materialNo);

		isFirstPage = false
	});

	doc.end();

	return new Response(doc, {
		status: 200,
		headers: { 'Content-Type': 'application/pdf' },
	});
};