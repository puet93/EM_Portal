import { json } from '@remix-run/node';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '~/db.server';

import type { LoaderFunction } from '@remix-run/node';

export const loader: LoaderFunction = async ({ request }) => {
  const searchParams = new URL(request.url).searchParams;
  const ids = searchParams.getAll('ids');

  if (ids.length === 0) {
    return json({ error: 'No fulfillments selected' });
  }

    const fulfillments = await prisma.fulfillment.findMany({
        where: { id: { in: ids } },
        include: { trackingInfo: true },
    });

    const labelUrls = fulfillments
        .map((fulfillment) => fulfillment.trackingInfo?.labelUrl)
        .filter((url) => url); // Remove null/undefined

    if (labelUrls.length === 0) {
        return json({ error: 'No shipping labels found.' });
    }

    try {
        // Download each PDF directly from the signed URL
        const labelBuffers = await Promise.all(
            labelUrls.map(async (url) => {
                try {
                    const response = await fetch(url);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Status: ${response.status}, Message: ${errorText}`);
                    }

                    return Buffer.from(await response.arrayBuffer());
                } catch (error) {
                    console.error(`Error downloading file from ${url}`, error);
                    return null;
                }
            })
        );

        const validBuffers = labelBuffers.filter((buffer) => buffer); // Filter out failed downloads

        if (validBuffers.length === 0) {
            return json({ error: 'Failed to download any shipping labels.' });
        }

        // Merge PDFs
        const mergedPdf = await PDFDocument.create();

        for (const buffer of validBuffers) {
            const pdf = await PDFDocument.load(buffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();

        // Return merged PDF for download
        return new Response(Buffer.from(mergedPdfBytes), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="merged_labels.pdf"',
            },
        });
    } catch (error) {
        console.error('Error merging PDFs:', error);
        return json({ error: 'Failed to merge shipping labels.' });
    }
};