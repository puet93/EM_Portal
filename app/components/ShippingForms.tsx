import { Link, useFetcher } from '@remix-run/react';

import { cleanPhoneNumber, stripHashtag } from '~/utils/helpers';
import { normalizeStateInput } from '~/utils/us-states';
import { Button, CopyButton } from '~/components/Buttons';
import { Input, Label, Select } from '~/components/Input';

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
	const today = new Date().toISOString().split("T")[0];

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
							<Label htmlFor="fullName">Name</Label>
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
							<Label htmlFor="addressLine1">Street address</Label>
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
							<Label htmlFor="addressLine2">
								Apartment, suite, unit, etc.
							</Label>
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
							<Label htmlFor="city">City</Label>
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
							<Label htmlFor="state">State</Label>
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
							<Label htmlFor="zip">ZIP code</Label>
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
							<Label htmlFor="phone">Phone number</Label>
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
							<Label htmlFor="filename">Filename</Label>
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
							<Label htmlFor="orderNo">Order No.</Label>
							<div className="mt-2">
								<Input
									id="orderNo"
									name="orderNo"
									type="text"
									defaultValue={orderNo}
								/>
							</div>
						</div>

						<div className="col-span-2">
							<Label htmlFor="packagingType">Packaging</Label>
							<div className="mt-2">
								<Select
									id="packagingType"
									name="packagingType"
									options={[
										{
											label: 'FedEx Pak',
											value: 'FEDEX_PAK',
										},
										{
											label: 'Roca - 14x14x8',
											value: 'ROCA_14X14X8',
										},
										{
											label: 'EPC - 9x9x9',
											value: 'EPC_9X9X9',
										},
									]}
								></Select>
							</div>
						</div>

						<div className="col-span-2">
							<Label htmlFor="packageWeight">Weight</Label>
							<div className="relative mt-2">
								<Input
									id="packageWeight"
									name="packageWeight"
									type="text"
								/>
								<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
									<span className="text-gray-500 dark:text-zinc-400 sm:text-sm">
										lbs
									</span>
								</div>
							</div>
						</div>

						<div className="col-span-2">
							<Label htmlFor="shipDate">Ship date</Label>
							<div className="relative mt-2">
								<Input
									id="shipDate"
									name="shipDate"
									type="date"
									defaultValue={today}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="mt-6 flex items-center justify-end gap-x-6">
				{fetcher?.data?.labelUrl && fetcher?.data?.trackingNumber ? (
					<div className="flex items-center gap-x-2 rounded-md bg-gray-100 py-1 pl-1 pr-3 dark:bg-zinc-950">
						<CopyButton
							text={fetcher.data.trackingNumber}
							successLabel="Copied tracking"
						/>

						<Link
							to={fetcher.data.labelUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm font-semibold transition-colors hover:text-sky-600 dark:hover:text-sky-400"
						>
							{fetcher.data.trackingNumber}
						</Link>
					</div>
				) : null}

				<Button color="primary" type="submit">
					{fetcher.state === 'idle' && 'Create Label'}
					{fetcher.state === 'submitting' && 'Creating Label...'}
					{fetcher.state === 'loading' && 'Loading...'}
				</Button>
			</div>
		</fetcher.Form>
	);
}
