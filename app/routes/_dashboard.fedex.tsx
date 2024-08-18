import { Form, Link, useActionData, useNavigation } from '@remix-run/react';
import { json } from '@remix-run/node';

import Button from '~/components/Button';
import { Input, InputLabel } from '~/components/Input';

import { createFedExShipment } from '~/utils/fedex.server';
import { uploadFileToGCS } from '~/utils/google-cloud-storage.server';
import { badRequest } from '~/utils/request.server';
import { normalizeStateInput } from '~/utils/us-states';

import type { ActionFunction } from '@remix-run/node';
import type { ShipmentData } from '~/utils/fedex.server';

export const action: ActionFunction = async ({ request }) => {
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
					phoneNumber: '5557773281',
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
		return json({ encodedLabel, labelUrl });
	} catch (error) {
		console.log('ERROR CLIENT', error);
		return json({ error });
	}
};

export default function FedEx() {
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();

	return (
		<div className="mx-auto max-w-xl px-6 py-12">
			<Form method="post">
				<div className="space-y-12">
					{/* Recipient Shipping Info */}
					<div className="border-b border-gray-900/10 pb-12 dark:border-white/10">
						<h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
							Recipient Shipping Info
						</h2>
						<p className="mt-1 text-sm font-light leading-6 text-gray-600 dark:text-zinc-400">
							To whom and where do you want to ship the package
							to?
						</p>

						{/* Input Group */}
						<div className="mt-10 grid grid-cols-6 gap-x-6 gap-y-8">
							{/* Name */}
							<div className="col-span-full">
								<InputLabel htmlFor="fullName">Name</InputLabel>
								<div className="mt-2">
									<Input
										id="fullName"
										name="fullName"
										type="text"
										defaultValue="Peter Parker"
										required
									/>
								</div>
							</div>

							{/* Address Line 1 */}
							<div className="col-span-full">
								<InputLabel htmlFor="addressLine1">
									Street Address
								</InputLabel>
								<div className="mt-2">
									<Input
										id="addressLine1"
										name="addressLine1"
										type="text"
										defaultValue="123 Main St"
										required
									/>
								</div>
							</div>

							{/* Address Line 2 */}
							<div className="col-span-full">
								<InputLabel htmlFor="addressLine2">
									Apartment, suite, unit, etc.
								</InputLabel>
								<div className="mt-2">
									<Input
										id="addressLine2"
										name="addressLine2"
										type="text"
										placeholder="Unit A"
										defaultValue="Apt 345"
									/>
								</div>
							</div>

							<div className="col-span-3">
								<InputLabel htmlFor="city">City</InputLabel>
								<div className="mt-2">
									<Input
										id="city"
										type="text"
										name="city"
										placeholder="New York City"
										defaultValue="New York City"
										required
									/>
								</div>
							</div>

							<div className="col-span-1">
								<InputLabel htmlFor="state">State</InputLabel>
								<div className="mt-2">
									<Input
										id="state"
										type="text"
										name="state"
										placeholder="NY"
										defaultValue="NY"
										required
									/>
								</div>
							</div>

							<div className="col-span-2">
								<InputLabel htmlFor="zip">ZIP code</InputLabel>
								<div className="mt-2">
									<Input
										id="zip"
										type="text"
										name="zip"
										placeholder="10001"
										defaultValue="10001"
										required
									/>
								</div>
							</div>

							<div className="col-span-2">
								<InputLabel htmlFor="phone">
									Phone number
								</InputLabel>
								<div className="mt-2">
									<Input
										id="phone"
										type="tel"
										name="phone"
										placeholder="5555555555"
										required
									/>
								</div>
							</div>
						</div>
					</div>

					{/* Configuration */}
					<div className="border-b border-gray-900/10 pb-12 dark:border-white/10">
						<h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
							Configuration
						</h2>
						<p className="mt-1 text-sm font-light leading-6 text-gray-600 dark:text-zinc-400">
							Package and shipping label configuration. Some input
							values are read only for testing purposes.
						</p>

						{/* Input Group */}
						<div className="mt-10 grid grid-cols-6 gap-x-6 gap-y-8">
							<div className="col-span-4">
								<InputLabel htmlFor="filename">
									Filename
								</InputLabel>
								<div className="relative mt-2">
									<Input
										id="filename"
										name="filename"
										type="text"
										defaultValue="5400-fedex"
									/>
									<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
										<span className="text-gray-500 dark:text-zinc-400 sm:text-sm">
											.pdf
										</span>
									</div>
								</div>
							</div>

							<div className="col-span-2">
								<InputLabel htmlFor="orderNo">
									Order No.
								</InputLabel>
								<div className="mt-2">
									<Input
										id="orderNo"
										name="orderNo"
										type="text"
										defaultValue="#5400"
									/>
								</div>
							</div>

							<div className="col-span-3">
								<InputLabel htmlFor="packaging">
									Packaging
								</InputLabel>
								<div className="mt-2">
									<Input
										id="packaging"
										name="packaging"
										type="text"
										defaultValue="FedEx Pak"
										readOnly
									/>
								</div>
							</div>

							<div className="col-span-3">
								<InputLabel htmlFor="weight">Weight</InputLabel>
								<div className="relative mt-2">
									<Input
										id="weight"
										name="weight"
										type="text"
										defaultValue="5.0"
										readOnly
									/>
									<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
										<span className="text-gray-500 dark:text-zinc-400 sm:text-sm">
											lbs
										</span>
									</div>
								</div>
							</div>

							{/* Ship date */}
							{/* Service (e.g. FedEx 2 Day or FedEx Home/Ground) */}
							{/* Residential address? */}
							{/* FedEx One Rate */}
							{/* Phone number */}
						</div>
					</div>
				</div>

				<div className="mt-6 flex items-center justify-end gap-x-6">
					<Button color="primary" type="submit">
						{navigation.state === 'idle' && 'Create Label'}
						{navigation.state === 'submitting' &&
							'Creating Label...'}
						{navigation.state === 'loading' && 'Loading...'}
					</Button>
				</div>

				{actionData?.labelUrl ? (
					<div className="mt-10">
						<div className="flex items-center gap-x-4 rounded-t-xl bg-black/20 py-4 pl-6 pr-5 leading-5">
							<Link
								to={actionData?.labelUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm font-semibold transition-colors hover:text-sky-400"
							>
								Download PDF
							</Link>
						</div>
					</div>
				) : null}

				{actionData?.errors && actionData.errors.length > 0
					? actionData.errors.map(
							(error: { code: string; message: string }) => (
								<div
									key={error.code}
									className="mt-4 rounded-lg bg-black/20 p-4 font-mono text-sm leading-6 text-red-400"
								>
									{error.message}
								</div>
							)
					  )
					: null}

				{actionData?.error ? (
					<div className="mt-4 rounded-lg bg-black/20 p-4 font-mono text-sm leading-6 text-red-400">
						<pre>
							{JSON.stringify(actionData.error.message, null, 4)}
						</pre>
					</div>
				) : null}
			</Form>
		</div>
	);
}
