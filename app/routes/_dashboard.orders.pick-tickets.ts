import { json } from '@remix-run/node';
import { prisma } from '~/db.server';
import { normalizeStateInput } from '~/utils/us-states';
import type { LoaderFunction } from '@remix-run/node';
import { PDFDocument } from 'pdf-lib';

export const loader: LoaderFunction = async ({ request }) => {
	const searchParams = new URL(request.url).searchParams;
	const ids = searchParams.getAll('ids');

	if (ids.length === 0) {
		return json({ error: 'No fulfillments selected' });
	}

	const fulfillments = await prisma.fulfillment.findMany({
		where: { id: { in: ids } },
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

	const pdfBuffers = await Promise.all(
		fulfillments.map(async (fulfillment) => {
			const orderDetails = formatOrderDetails(fulfillment);
			return generatePickTicketPDF(orderDetails);
		})
	);

	const combinedBuffer = await combinePDFBuffers(pdfBuffers);

	return new Response(combinedBuffer, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': 'inline; filename="pick-tickets.pdf"',
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

async function generatePickTicketPDF(orderDetails: string): Promise<Buffer> {
	const PDFDocument = require('pdfkit');
	const doc = new PDFDocument({
		size: [288, 432], // 4x6 inches in points (72 points per inch)
		margin: 10, // Small margin to fit the label
	});

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

async function combinePDFBuffers(buffers: Buffer[]): Promise<Buffer> {
	const combinedPdf = await PDFDocument.create();

	for (const buffer of buffers) {
		const pdf = await PDFDocument.load(buffer);
		const [copiedPage] = await combinedPdf.copyPages(
			pdf,
			pdf.getPageIndices()
		);
		combinedPdf.addPage(copiedPage);
	}

	const combinedPdfBuffer = await combinedPdf.save();
	return Buffer.from(combinedPdfBuffer);
}
