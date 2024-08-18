import { Link, useFetcher } from '@remix-run/react';

import { cleanPhoneNumber, stripHashtag } from '~/utils/helpers';
import { normalizeStateInput } from '~/utils/us-states';
import { Button } from '~/components/Buttons';
import { Input, InputLabel } from '~/components/Input';

interface ShippingLabelFormProps {
	phone?: string;
	fullName?: string;
	addressLine1?: string;
	addressLine2?: string;
	city?: string;
	state?: string;
	zip?: string;
	orderNo?: string;
	vendorName?: string;
}

export function ShippingLabelForm({
	phone = '',
	fullName = '',
	addressLine1 = '',
	addressLine2 = '',
	city = '',
	state = '',
	zip = '',
	orderNo = '',
	vendorName = 'fulfillment',
}: ShippingLabelFormProps) {
	const fetcher = useFetcher();
	const normalizedState = normalizeStateInput(state) || 'Invalid State';

	return (
		<fetcher.Form method="post" action="/api/fedex">
			<div className="space-y-12">
				{/* Recipient Shipping Info */}
				<div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-gray-900/10 pb-12 dark:border-white/10 md:grid-cols-3">
					<div>
						<h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
							Recipient Shipping Information
						</h2>
						<p className="mt-1 text-sm font-light leading-6 text-gray-600 dark:text-zinc-400">
							Please provide the details of the recipient and the
							destination address for this shipment.
						</p>
					</div>

					{/* Input Group */}
					<div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
						{/* Name */}
						<div className="col-span-full">
							<InputLabel htmlFor="fullName">Name</InputLabel>
							<div className="mt-2">
								<Input
									id="fullName"
									name="fullName"
									type="text"
									defaultValue={fullName}
									required
								/>
							</div>
						</div>

						{/* Address Line 1 */}
						<div className="col-span-full">
							<InputLabel htmlFor="addressLine1">
								Street address
							</InputLabel>
							<div className="mt-2">
								<Input
									id="addressLine1"
									name="addressLine1"
									type="text"
									defaultValue={addressLine1}
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
									defaultValue={addressLine2}
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
									defaultValue={city}
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
									defaultValue={normalizedState}
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
									defaultValue={zip}
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
									defaultValue={cleanPhoneNumber(phone)}
									required
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Configuration */}
				<div className="grid grid-cols-1 gap-x-8 gap-y-10 border-b border-gray-900/10 pb-12 dark:border-white/10 md:grid-cols-3">
					<div>
						<h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
							Configuration
						</h2>
						<p className="mt-1 text-sm font-light leading-6 text-gray-600 dark:text-zinc-400">
							Configure the package and shipping label details.
							Please note that some input fields are read-only for
							testing purposes, as this feature is currently in
							beta. At the moment, only FedEx Pak shipments are
							supported.
						</p>
					</div>

					{/* Input Group */}
					<div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2">
						<div className="sm:col-span-4">
							<InputLabel htmlFor="filename">Filename</InputLabel>
							<div className="relative mt-2">
								<Input
									id="filename"
									name="filename"
									type="text"
									defaultValue={`${stripHashtag(
										orderNo
									)}-${vendorName.toLocaleLowerCase()}-fedex`}
								/>
								<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
									<span className="text-gray-500 dark:text-zinc-400 sm:text-sm">
										.pdf
									</span>
								</div>
							</div>
						</div>

						<div className="col-span-2">
							<InputLabel htmlFor="orderNo">Order No.</InputLabel>
							<div className="mt-2">
								<Input
									id="orderNo"
									name="orderNo"
									type="text"
									defaultValue={orderNo}
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

						{/* Service (e.g. FedEx 2 Day or FedEx Home/Ground) */}
						{/* Residential address? */}
						{/* FedEx One Rate */}
					</div>
				</div>
			</div>

			<div className="mt-6 flex items-center justify-end gap-x-6">
				<Button color="primary" type="submit">
					{fetcher.state === 'idle' && 'Create Label'}
					{fetcher.state === 'submitting' && 'Creating Label...'}
					{fetcher.state === 'loading' && 'Loading...'}
				</Button>
			</div>

			{fetcher?.data?.labelUrl ? (
				<div className="mt-10">
					<div className="flex items-center gap-x-4 rounded-t-xl bg-black/20 py-4 pl-6 pr-5 leading-5">
						<Link
							to={fetcher.data.labelUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm font-semibold transition-colors hover:text-sky-400"
						>
							{fetcher.data.trackingNumber
								? fetcher.data.trackingNumber
								: 'Download PDF'}
						</Link>
					</div>
				</div>
			) : null}
		</fetcher.Form>
	);
}
