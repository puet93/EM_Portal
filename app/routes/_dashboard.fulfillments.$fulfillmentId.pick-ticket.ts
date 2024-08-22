import { json } from '@remix-run/node';
import { prisma } from '~/db.server';
import { normalizeStateInput } from '~/utils/us-states';
import type { LoaderFunction } from '@remix-run/node';

export const loader: LoaderFunction = async ({ params }) => {
	const fulfillmentId = params.fulfillmentId;
	const fulfillment = await prisma.fulfillment.findUnique({
		where: { id: fulfillmentId },
		include: {
			order: {
				include: {
					address: true,
				},
			},
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

	const orderDetails = formatOrderDetails(fulfillment);
	const pdfBuffer = await generateFedExLabelPDF(orderDetails);

	return new Response(pdfBuffer, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': 'inline; filename="fedex-label.pdf"',
		},
	});
};

function formatOrderDetails(data: any): string {
	const orderNo = `Order No. ${data.order.name}`;
	const items = data.lineItems
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

	const address = data.order.address;
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
		data.trackingInfo?.number || '',
		data.trackingInfo?.company || '',
	]
		.filter((line) => line.trim() !== '') // Remove any empty lines
		.join('\n');

	const divider =
		'--------------------------------------------------------------------------------';

	return `${orderNo}\n${divider}\n${items}\n\nShip to\n${addressString}\n\n${trackingInfo}`.trim();
}

async function generateFedExLabelPDF(orderDetails: string): Promise<Buffer> {
	// Create a new PDF document with a 4x6 inches size (288x432 points)
	const PDFDocument = require('pdfkit');
	const doc = new PDFDocument({
		size: [288, 432], // 4x6 inches in points (72 points per inch)
		margin: 10, // Small margin to fit the label
	});

	// Add text to the PDF
	doc.font('Helvetica-Bold').fontSize(10).text(orderDetails, {
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
