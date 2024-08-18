import axios from 'axios';

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
		shipmentSpecialServices: {
			specialServiceTypes: Array<
				'FEDEX_ONE_RATE' | 'SATURDAY_DELIVERY' | 'SATURDAY_PICKUP'
			>;
		};
		labelSpecification: {
			labelStockType: string;
			imageType: string;
		};
		requestedPackageLineItems: Array<{
			sequenceNumber: string;
			weight: {
				units: string;
				value: number;
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

export async function getFedExAccessToken(): Promise<
	string | FedExAuthError[]
> {
	const url = 'https://apis-sandbox.fedex.com/oauth/token';
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

export async function createFedExShipment(
	shipmentData: ShipmentData
): Promise<FedExResponse> {
	const token = await getFedExAccessToken();
	const url = 'https://apis-sandbox.fedex.com/ship/v1/shipments';
	const accountNumber = { value: process.env.FEDEX_ACCOUNT_NUMBER };

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

		return response.data as FedExResponse;
	} catch (error: any) {
		// Extract specific error details if available
		const fedexErrors = error.response?.data?.errors;
		const errorMessage = fedexErrors
			? `FedEx API Error: ${fedexErrors
					.map((err: FedExError) => `${err.code}: ${err.message}`)
					.join(', ')}`
			: 'Failed to create shipment';

		console.log('Error creating shipment', error.response?.data);

		// Throw a new Error with a detailed message
		throw new Error(errorMessage);
	}
}
