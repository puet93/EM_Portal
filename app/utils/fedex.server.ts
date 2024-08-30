import axios from 'axios';
import { cleanPhoneNumber } from './helpers';

// const baseUrl =
// 	process.env.NODE_ENV === 'production'
// 		? 'https://apis.fedex.com'
// 		: 'https://apis-sandbox.fedex.com';
const baseUrl = 'https://apis.fedex.com';

interface FedExAuthError {
	code: string;
	message: string;
}

interface FedExError {
	code: string;
	message: string;
}

interface FedExResponse {
	output?: any; // Replace `any` with a more specific type if available
	errors?: FedExError[];
}

export interface ShipmentData {
	mergeLabelDocOption: string;
	requestedShipment: {
		shipper: {
			address: {
				streetLines: string[];
				city: string;
				stateOrProvinceCode: string;
				postalCode: string;
				countryCode: string;
				residential: boolean;
			};
			contact: {
				companyName: string;
				phoneNumber: string;
			};
		};
		recipients: Array<{
			address: {
				streetLines: string[];
				city: string;
				stateOrProvinceCode: string;
				postalCode: string;
				countryCode: string;
				residential: boolean;
			};
			contact: {
				personName: string;
				phoneNumber: string;
			};
		}>;
		pickupType: string;
		serviceType: string;
		packagingType: string;
		totalWeight: number;
		shippingChargesPayment: {
			paymentType: string;
		};
		shipmentSpecialServices?: {
			specialServiceTypes: Array<
				'FEDEX_ONE_RATE' | 'SATURDAY_DELIVERY' | 'SATURDAY_PICKUP'
			>;
		};
		labelSpecification: {
			labelStockType:
				| 'PAPER_85X11_BOTTOM_HALF_LABEL'
				| 'PAPER_85X11_TOP_HALF_LABEL'
				| 'STOCK_4X6';
			imageType: string;
		};
		requestedPackageLineItems: Array<{
			sequenceNumber: string;
			weight: {
				units: string;
				value: number;
			};
			dimensions?: {
				length: number;
				width: number;
				height: number;
				units: 'IN' | 'CM';
			};
			customerReferences?: Array<{
				customerReferenceType: 'P_O_NUMBER' | 'INVOICE_NUMBER';
				value: string;
			}>;
		}>;
	};
	labelResponseOptions: string;
}

if (!process.env.FEDEX_CLIENT_ID || !process.env.FEDEX_CLIENT_SECRET) {
	throw new Error('Missing FedEx API keys');
}

export async function fetchFedExAccessToken(): Promise<
	string | FedExAuthError[]
> {
	const url = baseUrl + '/oauth/token';
	const data = new URLSearchParams({
		grant_type: 'client_credentials',
		client_id: process.env.FEDEX_CLIENT_ID as string,
		client_secret: process.env.FEDEX_CLIENT_SECRET as string,
	});

	try {
		const response = await axios.post(url, data, {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		});

		return response.data.access_token;
	} catch (error: any) {
		console.error(
			'Error fetching FedEx access token:',
			error.response?.data
		);

		const errors: FedExAuthError[] = error.response?.data?.errors || [
			{
				code: 'UNKNOWN',
				message: error.message || 'Unknown error occurred',
			},
		];

		return errors;
	}
}

export async function fetchFedExTrackingAPIToken(): Promise<
	string | FedExAuthError[]
> {
	const url = baseUrl + '/oauth/token';
	const data = new URLSearchParams({
		grant_type: 'client_credentials',
		client_id: 'l7a1ec0134e7c5450ea5ce339bdb9ac18e', // 'l719b45cf31b9843d1a39f3fe7cb1ec559', // process.env.FEDEX_CLIENT_ID as string,
		client_secret: '0ab421ceb8184480be621445dae52091', // 'e2eb891d0ae6478f89ea941e3e4aeaea', // process.env.FEDEX_CLIENT_SECRET as string,
	});

	try {
		const response = await axios.post(url, data, {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		});

		return response.data.access_token;
	} catch (error: any) {
		console.error(
			'Error fetching FedEx access token:',
			error.response?.data
		);

		const errors: FedExAuthError[] = error.response?.data?.errors || [
			{
				code: 'UNKNOWN',
				message: error.message || 'Unknown error occurred',
			},
		];

		return errors;
	}
}

export async function createFedExShipment(
	shipmentData: ShipmentData
): Promise<FedExResponse> {
	const token = await fetchFedExAccessToken();
	const url = baseUrl + '/ship/v1/shipments';
	const accountNumber = { value: process.env.FEDEX_ACCOUNT_NUMBER };

	shipmentData.requestedShipment.shipper.contact.phoneNumber =
		cleanPhoneNumber(
			shipmentData.requestedShipment.shipper.contact.phoneNumber
		);

	shipmentData.requestedShipment.recipients =
		shipmentData.requestedShipment.recipients.map((recipient) => ({
			...recipient,
			contact: {
				...recipient.contact,
				phoneNumber: cleanPhoneNumber(recipient.contact.phoneNumber),
			},
		}));

	try {
		const response = await axios.post(
			url,
			{ ...shipmentData, accountNumber },
			{
				headers: {
					'Content-Type': 'application/json',
					'X-locale': 'en_US',
					Authorization: `Bearer ${token}`,
				},
			}
		);

		// Extract the tracking number from the response
		const trackingNumber =
			response.data.output?.transactionShipments?.[0]
				?.masterTrackingNumber;

		return {
			...response.data,
			trackingNumber, // Include the tracking number in the return value
		};
	} catch (error: any) {
		// Extract specific error details if available
		const fedexErrors = error.response?.data?.errors;
		const errorMessage = fedexErrors
			? `FedEx API Error: ${fedexErrors
					.map((err: FedExError) => `${err.code}: ${err.message}`)
					.join(', ')}`
			: 'Failed to create shipment';

		console.log(
			'Error creating shipment:',
			error.response?.data || error.message
		);
		console.log('JWT used:', token); // Log the JWT for inspection

		// Throw a new Error with a detailed message
		throw new Error(errorMessage);
	}
}

export async function fetchTrackingStatus(
	trackingNumbers: string[]
): Promise<string | null> {
	const token = await fetchFedExTrackingAPIToken();
	const url = baseUrl + '/track/v1/trackingnumbers';
	const trackingInfo = trackingNumbers.map((trackingNumber) => ({
		trackingNumberInfo: { trackingNumber },
	}));

	const payload = {
		includeDetailedScans: true,
		trackingInfo: trackingInfo,
	};

	try {
		const response = await axios.post(url, payload, {
			headers: {
				'Content-Type': 'application/json',
				'X-locale': 'en_US',
				Authorization: `Bearer ${token}`,
			},
		});

		if (response?.status !== 200) {
			return null;
		}

		// Transform the response into a single object
		const trackingStatuses =
			response.data.output.completeTrackResults.reduce((acc, result) => {
				const trackingNumber =
					result.trackResults[0].trackingNumberInfo.trackingNumber;
				const status =
					result.trackResults[0].latestStatusDetail.description;

				acc[trackingNumber] = status;
				return acc;
			}, {});

		return trackingStatuses;
	} catch (error) {
		console.log('-------- FEDEX TRACKING ERROR --------');
		console.log(error);
		return null;
	}
}
