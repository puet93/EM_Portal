import { json } from '@remix-run/node';

import { createFedExShipment } from '~/utils/fedex.server';
import { uploadFileToGCS } from '~/utils/google-cloud-storage.server';
import { badRequest } from '~/utils/request.server';
import { normalizeStateInput } from '~/utils/us-states';
import { requireSuperAdmin } from '~/session.server';

import type { ActionFunction } from '@remix-run/node';
import type { ShipmentData } from '~/utils/fedex.server';

export const action: ActionFunction = async ({ request }) => {
	await requireSuperAdmin(request);

	const formData = await request.formData();
	const filename = formData.get('filename') as string | null;
	const fullName = formData.get('fullName') as string | null;
	const addressLine1 = formData.get('addressLine1') as string | null;
	const addressLine2 = formData.get('addressLine2') as string | null;
	const city = formData.get('city') as string | null;
	const state = formData.get('state') as string | null;
	const zip = formData.get('zip') as string | null;
	const phone = formData.get('phone') as string | null;

	const orderNo = formData.get('orderNo') as string | null;

	if (
		!fullName ||
		!filename ||
		!addressLine1 ||
		!state ||
		!city ||
		!zip ||
		!phone ||
		!orderNo
	) {
		return badRequest({ error: 'All fields are required' });
	}

	const streetLines = [addressLine1];
	if (addressLine2) {
		streetLines.push(addressLine2);
	}

	// Normalize the state input
	const normalizedState = normalizeStateInput(state);

	if (!normalizedState) {
		return badRequest({ error: 'Invalid state abbreviation or name' });
	}

	const shipmentData: ShipmentData = {
		mergeLabelDocOption: 'LABELS_AND_DOCS',
		requestedShipment: {
			shipper: {
				address: {
					streetLines: ['823 Emerald Bay'],
					city: 'Laguna Beach',
					stateOrProvinceCode: 'CA',
					postalCode: '92651',
					countryCode: 'US',
					residential: true,
				},
				contact: {
					companyName: 'Edward Martin, LLC',
					phoneNumber: '9092356728',
				},
			},
			recipients: [
				{
					address: {
						streetLines: streetLines,
						city: city,
						stateOrProvinceCode: normalizedState,
						postalCode: zip,
						countryCode: 'US',
						residential: true,
					},
					contact: {
						personName: fullName,
						phoneNumber: phone,
					},
				},
			],
			pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
			serviceType: 'FEDEX_2_DAY',
			packagingType: 'FEDEX_PAK',
			totalWeight: 5.0,
			shippingChargesPayment: {
				paymentType: 'SENDER',
			},
			shipmentSpecialServices: {
				specialServiceTypes: ['FEDEX_ONE_RATE'],
			},
			labelSpecification: {
				labelStockType: 'STOCK_4X6',
				imageType: 'PDF',
			},
			requestedPackageLineItems: [
				{
					sequenceNumber: '1',
					weight: { units: 'LB', value: 5.0 },
					customerReferences: [
						{
							customerReferenceType: 'P_O_NUMBER',
							value: orderNo,
						},
					],
				},
			],
		},
		labelResponseOptions: 'LABEL',
	};

	try {
		// Create FedEx shipment
		const response = await createFedExShipment(shipmentData);
		const transactionShipments = response?.output?.transactionShipments;
		const trackingNumber = response?.trackingNumber;

		if (!transactionShipments || transactionShipments.length === 0) {
			return json({
				message: 'No shipment found',
				errors: response.errors,
			});
		}

		// Extract the package document
		const packageDocument =
			transactionShipments[0].pieceResponses[0].packageDocuments[0];
		const encodedLabel = packageDocument?.encodedLabel;

		if (!encodedLabel) {
			return json({ error: 'Failed to retrieve label' });
		}

		// Decode the label and upload to Google Cloud Storage
		const labelBuffer = Buffer.from(encodedLabel, 'base64');
		const labelUrl = await uploadFileToGCS(labelBuffer, filename + '.pdf');

		// Return the label URL and encoded label
		return json({ encodedLabel, labelUrl, trackingNumber });
	} catch (error) {
		console.log('ERROR CLIENT', error);
		return json({ error });
	}
};
