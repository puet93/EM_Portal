import { useLoaderData } from '@remix-run/react';
import { json } from '@remix-run/node';
import { prisma } from '~/db.server';
import { createFedExShipment } from '~/utils/fedex.server';
import { uploadFileToGCS } from '~/utils/google-cloud-storage.server';
import { normalizeStateInput } from '~/utils/us-states';
import { createFulfillment } from '~/utils/shopify.server';

import { Button } from '~/components/Buttons';

import type { ShipmentData } from '~/utils/fedex.server';
import type { LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = async ({ request }) => {
	const searchParams = new URL(request.url).searchParams;
	const ids = searchParams.getAll('ids');
	
	let shipDate = searchParams.get('shipDate')?.trim();
  
	// If shipDate is empty, use the current date in Pacific Time
	const shipDatestamp =
		shipDate && shipDate !== ''
			? shipDate
			: new Date().toLocaleDateString('en-US', {
					timeZone: 'America/Los_Angeles',
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
			  })
			  .split('/')
			  .reverse()
			  .join('-');

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

	// Generate a shipping label for each fulfullment
	const results = await Promise.allSettled(
		fulfillments.map(async (fulfillment) => {
			if (fulfillment?.trackingInfo?.number) {
				return fulfillment;
			}

			const { address } = fulfillment.order;
			const { line1, line2, line3, city, state, postalCode, phoneNumber } = address;
			const streetLines = [line2];
	
			if (address.line3) {
				streetLines.push(line3);
			}
	
			// Normalize the state input
			if (!state) return
			const normalizedState = normalizeStateInput(state);
			if (!normalizedState) return
	
			// TODO: Get these dynamically
			const filename = fulfillment.order.name;
			const packagingType = 'FEDEX_PAK';
			const numberOfItems = fulfillment.lineItems.length;
			const estimatedWeight = Math.ceil(numberOfItems * 0.5);
			const totalWeight = estimatedWeight;
	
			const shipmentData: ShipmentData = {
				mergeLabelDocOption: 'LABELS_AND_DOCS',
				requestedShipment: {
					shipDatestamp: shipDatestamp,
					shipper: {
						address: {
							streetLines: ['15411 Red Hill Ave', 'Suite E'],
							city: 'Tustin',
							stateOrProvinceCode: 'CA',
							postalCode: '92780',
							countryCode: 'US',
							residential: false,
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
								postalCode: postalCode,
								countryCode: 'US',
								residential: true,
							},
							contact: {
								personName: line1,
								phoneNumber: phoneNumber,
							},
						},
					],
					pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
					serviceType:
						packagingType === 'FEDEX_PAK'
							? 'FEDEX_2_DAY'
							: 'GROUND_HOME_DELIVERY', // Must be FEDEX_GROUND if not residential
					packagingType:
						packagingType === 'FEDEX_PAK' ? 'FEDEX_PAK' : 'YOUR_PACKAGING',
					totalWeight: totalWeight,
					shippingChargesPayment: {
						paymentType: 'SENDER',
					},
					...(packagingType === 'FEDEX_PAK' && {
						shipmentSpecialServices: {
							specialServiceTypes: ['FEDEX_ONE_RATE'],
						},
					}),
					labelSpecification: {
						labelStockType: 'STOCK_4X6', // TODO: Add options for users: 'PAPER_85X11_TOP_HALF_LABEL', 'PAPER_85X11_TOP_HALF_LABEL', 'STOCK_4X6'
						imageType: 'PDF',
					},
					requestedPackageLineItems: [
						{
							sequenceNumber: '1',
							weight: { units: 'LB', value: totalWeight },
							...(packagingType !== 'FEDEX_PAK' && {
								dimensions:
									packagingType === 'ROCA_14X14X8'
										? {
												length: 14,
												width: 14,
												height: 8,
												units: 'IN',
											}
										: packagingType === 'EPC_9X9X9'
										? {
												length: 9,
												width: 9,
												height: 9,
												units: 'IN',
											}
										: undefined,
							}),
							customerReferences: [
								{
									customerReferenceType: 'P_O_NUMBER',
									value: fulfillment.order.name,
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
	
				if (!trackingNumber) {
					return // TODO: return error message
				}
		
				if (!transactionShipments || transactionShipments.length === 0) {
					return // TODO: return error message
				}
		
				// Extract the package document
				const packageDocument = transactionShipments[0].pieceResponses[0].packageDocuments[0];
				const encodedLabel = packageDocument?.encodedLabel;
	
				if (!encodedLabel) {
					return // TODO: return error message
				}
		
				// Decode the label and upload to Google Cloud Storage
				const labelBuffer = Buffer.from(encodedLabel, 'base64');
				const labelUrl = await uploadFileToGCS(labelBuffer, filename + '.pdf');
	
				const updatedFulfillment = await prisma.fulfillment.update({
					where: { id: fulfillment.id },
					data: {
						trackingInfo: {
							upsert: {
								update: {
									number: trackingNumber,
									company: 'FedEx',
									labelUrl: labelUrl
								},
								create: {
									number: trackingNumber,
									company: 'FedEx',
									labelUrl: labelUrl,
								}
							}
						}
					},
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
				})
		
				// Return the label URL and encoded label
				return updatedFulfillment;
			} catch (error) {
				console.log(error);
				return;
			}
		})
	)

	// Update tracking number on Shopify
	try {
		await Promise.allSettled(
			results.map(async (result) => {
				const { status, value } = result;
				const { shopifyFulfillmentOrderId, trackingInfo } = value;
	
				if (status === 'fulfilled' && shopifyFulfillmentOrderId && trackingInfo) {
					return await createFulfillment(
						shopifyFulfillmentOrderId, 
						true,
						{
							company: 'FedEx',
							number: trackingInfo.number,
							url: `https://www.fedex.com/fedextrack/?trknbr=${trackingInfo.number}`
						}
					);
				} else {
					return;
				}
			})
		 )
	} catch {
		console.log('Unable to update Shopify');
	}

	return json({ fulfillments, results });
}

export default function What() {
	const data = useLoaderData<typeof loader>();

	const handleDownloadMergedLabels = async () => {
		const url = new URL('/orders/shipping-labels-merged', window.location.origin);

		data.results.forEach(({ value }) => {
			if (value?.id && value.trackingInfo.labelUrl) {
				url.searchParams.append('ids', value.id);
		  	}
		});

		window.open(url.toString(), '_blank');
	};

	return (
		<>
			<h1>Shipping Labels</h1>

			<h2>{data.results.length} Orders</h2>

			<div className="mt-3">
				<Button color="primary" onClick={handleDownloadMergedLabels}>Merge and Print Labels</Button>
			</div>

			{data.results && data.results.length > 0 ? 
				(
					<ol className="mt-8">
						{data.results.map(({ status, value }) => { 
							if (status === 'fulfilled') {
								return value ? (
									<li key={value.id} className="mt-5">

										<div className="text-sm leading-6">{value.name ? value.name : 'This fulfillment order is missing its name.'}</div>
										
										{value?.trackingInfo?.number && (
											<div className="text-sm leading-6 text-gray-500 dark:text-zinc-400">{value.trackingInfo.number}</div>
										)}

										{value?.trackingInfo?.company && (
											<div className="text-sm leading-6 text-gray-500 dark:text-zinc-400">{value.trackingInfo.company}</div>
										)}
									
										{value?.trackingInfo?.labelUrl && (
											<a className="text-sm leading-6 text-sky-600" href={value.trackingInfo.labelUrl}>Download</a>
										)}
									</li>
								) : null
							} else {
								return <li>Something happened</li>
							}
						})}
					</ol>
				) :
				<div>No orders found</div>
			}
		</>
	)
}