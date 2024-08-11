import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import {
	Form,
	useActionData,
	useFetcher,
	useLoaderData,
	useSubmit,
} from '@remix-run/react';
import { fetchOrderByName } from '~/utils/shopify.server';
import { prisma } from '~/db.server';
import { useRef, useState } from 'react';
import { TrashIcon } from '~/components/Icons';
import { badRequest } from '~/utils/request.server';

// Custom components
import Button from '~/components/Button';
import Counter from '~/components/Counter';

function cleanPhoneNumber(phoneNumber: string): string {
	// Remove all special characters: (, ), +, -, and spaces
	let cleanedNumber = phoneNumber.replace(/[\s()+-]/g, '');

	// Remove the leading '1' if it exists (for U.S. country code)
	if (cleanedNumber.startsWith('1') && cleanedNumber.length === 11) {
		cleanedNumber = cleanedNumber.substring(1);
	}

	return cleanedNumber;
}

export const loader: LoaderFunction = async ({ request }) => {
	const searchParams = new URL(request.url).searchParams;
	const query = searchParams.get('query');

	// Shopify sample order search
	let errors: { order?: string; searchHint?: string } = {};
	let order;
	let searchHint;
	let cleanedNumber;

	if (query) {
		order = await fetchOrderByName(query);

		if (order?.shippingAddress?.phone) {
			cleanedNumber = cleanPhoneNumber(order.shippingAddress.phone);
		}

		if (order?.lineItems) {
			let skus = order.lineItems.map((item) => item.sku);
			searchHint = skus.join(', ');
		}
	}

	if (Object.keys(errors).length !== 0) return json({ errors });
	return json({ order, searchHint, cleanedNumber });
};

export const action: ActionFunction = async ({ request }) => {
	const formData = await request.formData();
	const cart = formData.get('cart');
	const address = formData.get('address');
	const orderName = formData.get('orderName');
	const shopifyOrderId = formData.get('shopifyOrderId');

	if (typeof cart !== 'string' || cart.length === 0) {
		return json({ error: 'Unable to get cart.' });
	}

	if (typeof address !== 'string' || address.length === 0) {
		return json({ error: 'Unable to get address.' });
	}

	if (typeof orderName !== 'string' || orderName.length === 0) {
		return json({ error: 'Unable to get order name.' });
	}

	if (typeof shopifyOrderId !== 'string' || shopifyOrderId.length === 0) {
		return json({ error: 'Unable to get order id.' });
	}

	const parsedCart: { id: string; quantity: string }[] = JSON.parse(cart);
	const parsedAddress = JSON.parse(address);
	const fulfillments: string[] = [];

	parsedCart.filter((item) => {
		if (!item.vendorId) return; // Seems like a good place to check for no vendors

		if (!fulfillments.includes(item.vendorId)) {
			fulfillments.push(item.vendorId);
		}
	});

	try {
		const response = await prisma.$transaction(async (tx) => {
			// Create the order, order line items, and fulfillments
			const order = await prisma.order.create({
				data: {
					name: orderName,
					shopifyOrderId: shopifyOrderId,
					lineItems: {
						create: parsedCart.map((item) => ({
							sampleId: item.id,
							quantity: Number(item.quantity),
						})),
					},
					fulfillments: {
						create: fulfillments.map((vendorId, index) => ({
							name: `${orderName}-F${index + 1}`,
							vendorId: vendorId,
						})),
					},
					address: {
						create: parsedAddress,
					},
				},
				include: {
					lineItems: {
						include: {
							sample: true,
						},
					},
					fulfillments: true,
				},
			});

			// Add the order line-items as fulfillment line-items to the correct fulfillments
			order.lineItems.map(async (orderLineItem) => {
				const fulfillment = await prisma.fulfillment.findFirst({
					where: {
						orderId: order.id,
						vendorId: orderLineItem.sample.vendorId,
					},
				});

				if (!fulfillment)
					throw new Error('Unable to find fulfillment!');

				await prisma.fulfillmentLineItem.create({
					data: {
						orderLineItemId: orderLineItem.id,
						fulfillmentId: fulfillment.id,
					},
				});
			});

			return order;
		});

		return redirect(`/orders/drafts/${response.id}`);
	} catch (e) {
		return badRequest({ errors: { form: 'Unable to complete order.' } });
	}
};

export default function NewOrderPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const search = useFetcher();
	const shippingAddressForm = useRef<HTMLFormElement>(null);
	const submit = useSubmit();
	const [cart, setCart] = useState([]);
	const addressFormId = 'address-form';

	return (
		<>
			<div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
				<header className="page-header">
					<div className="page-header__row">
						<h1 className="text-4xl font-bold text-gray-900 dark:text-white">
							Create Order
						</h1>

						<div className="ml-auto mt-1 flex items-center gap-x-4">
							<div className="input">
								<input
									form={addressFormId}
									placeholder="Order Name"
									type="text"
									id="order-name"
									name="orderName"
									defaultValue={data.order?.name}
								/>
							</div>

							<input
								form={addressFormId}
								type="hidden"
								name="shopifyOrderId"
								defaultValue={data.order?.id}
							/>

							<div className="flex gap-x-4">
								<Button to="..">Discard</Button>

								<Button color="primary" onClick={handleSubmit}>
									Save
								</Button>
							</div>
						</div>
					</div>

					{actionData?.errors?.form ? (
						<div className="page-header__row">
							<div className="error message">
								{actionData.errors.form}
							</div>
						</div>
					) : null}
				</header>
			</div>

			{/* Autocomplete */}
			<div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
				<div className="rounded-lg bg-gray-50 p-6 dark:bg-zinc-800">
					<Form
						className="flex items-center gap-x-6"
						method="get"
						replace
					>
						<div className="grow">
							<label
								htmlFor="autofill-query"
								className="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
							>
								Prefetch data from Shopify Order No.
							</label>
							<div className="mt-2">
								<input
									autoFocus
									type="text"
									id="autofill-query"
									name="query"
									placeholder="#2743"
									className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-zinc-950 dark:text-white dark:ring-0 sm:text-sm sm:leading-6"
								/>
							</div>
							<p
								id="autofill-description"
								className="mt-2 text-sm text-gray-500 dark:text-zinc-300"
							>
								This will pull data from the specified Shopify
								order and populate that data onto this draft
								order.
							</p>
						</div>

						<div className="mt-1">
							<Button type="submit" color="primary">
								Autofill
							</Button>
						</div>
					</Form>
				</div>
			</div>

			<div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
				<div className="foobar">
					<section className="foobar-main-content">
						<search.Form method="get" action="/swatch">
							<div className="flex flex-row-reverse items-end gap-x-6">
								<Button color="primary" type="submit">
									Search
								</Button>

								<div className="grow">
									<label
										htmlFor="query"
										className="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
									>
										Search
									</label>

									<div className="mt-2">
										<input
											className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:placeholder:text-zinc-400 dark:focus:ring-indigo-500 sm:text-sm sm:leading-6"
											type="text"
											name="query"
											id="query"
											placeholder="Search"
											autoComplete="off"
											defaultValue={data.searchHint}
										/>
									</div>
								</div>
							</div>
						</search.Form>

						{search?.data?.errors &&
							search.data.errors.map((error: string) => (
								<div key={error} className="error message">
									{error}
								</div>
							))}

						{search?.data?.results ? (
							<ResultsTable
								results={search.data.results}
								cart={cart}
								handleChange={handleChange}
								isAlreadyInCart={isAlreadyInCart}
							/>
						) : null}
					</section>

					<aside className="foobar-sidebar sample-cart">
						<div className="rounded-lg bg-gray-50 p-6 dark:bg-zinc-800">
							<form ref={shippingAddressForm} id={addressFormId}>
								<div className="input input--sm">
									<label htmlFor="fullName">Name</label>
									<input
										type="text"
										autoComplete="name"
										id="fullName"
										name="fullName"
										defaultValue={
											data.order?.shippingAddress?.name
												? data.order.shippingAddress
														.name
												: ''
										}
									/>
								</div>

								<div className="input input--sm">
									<label htmlFor="ship-to-address-line-1">
										Street Address
									</label>
									<input
										type="text"
										autoComplete="address-line1"
										id="ship-to-address-1"
										name="address1"
										defaultValue={
											data.order?.shippingAddress
												?.address1
												? data.order.shippingAddress
														.address1
												: ''
										}
									/>
								</div>

								<div className="input input--sm">
									<label htmlFor="ship-to-address-line-2">
										Suite, Unit, Apt #
									</label>
									<input
										type="text"
										autoComplete="address-line2"
										id="ship-to-address-line-2"
										name="address2"
										defaultValue={
											data.order?.shippingAddress
												?.address2
												? data.order.shippingAddress
														.address2
												: ''
										}
									/>
								</div>

								<div className="input input--sm">
									<label htmlFor="ship-to-city">City</label>
									<input
										type="text"
										autoComplete="address-level2"
										id="ship-to-city"
										name="city"
										defaultValue={
											data.order?.shippingAddress?.city
												? data.order.shippingAddress
														.city
												: ''
										}
									/>
								</div>

								<div className="input input--sm">
									<label htmlFor="ship-to-state">State</label>
									<input
										type="text"
										autoComplete="address-level1"
										id="ship-to-state"
										name="province"
										defaultValue={
											data.order?.shippingAddress
												?.province
												? data.order.shippingAddress
														.province
												: ''
										}
									/>
								</div>

								<div className="input input--sm">
									<label htmlFor="ship-to-zip">
										ZIP Code
									</label>
									<input
										type="text"
										autoComplete="postal-code"
										id="ship-to-zip"
										name="zip"
										defaultValue={
											data.order?.shippingAddress?.zip
												? data.order.shippingAddress.zip
												: ''
										}
									/>
								</div>

								<div>
									<label
										htmlFor="phoneNumber"
										className="text-sm font-semibold leading-4 text-gray-900 dark:text-white"
									>
										Phone number
									</label>
									<input
										defaultValue={
											data.cleanedNumber
												? data.cleanedNumber
												: ''
										}
										name="phoneNumber"
										id="phoneNumber"
										className="rounded-md bg-white text-gray-900 dark:bg-zinc-950 dark:text-white dark:ring-0"
									/>
								</div>
							</form>
						</div>

						<div style={{ marginTop: 64 }}>
							{cart.length > 0 ? (
								<h2 className="headline-h6">
									Item Count:{' '}
									{cart.reduce(
										(accumulator, item) =>
											accumulator + item.quantity,
										0
									)}
								</h2>
							) : null}

							<ul className="sample-cart-list">
								{cart.map((item) => (
									<li
										className="sample-cart-item"
										key={item.id}
									>
										<div className="sample-cart-item__description">
											<div className="">
												{item.materialNo}
											</div>
										</div>

										<Counter
											min={1}
											name={`quantity-${item.materialNo}`}
											onChange={(quantity) => {
												handleQtyChange(quantity, item);
											}}
											defaultValue={1}
										/>

										<button
											aria-label="Delete"
											className="sample-cart-delete-button"
											onClick={() => {
												removeFromCart(item);
											}}
										>
											<TrashIcon />
										</button>
									</li>
								))}
							</ul>
						</div>
					</aside>
				</div>
			</div>
		</>
	);

	function handleSubmit() {
		const form = shippingAddressForm.current;
		if (!form) return;

		const address = {
			line1: form['fullName'].value || undefined,
			line2: form['address1'].value || undefined,
			line3: form['address2'].value || undefined,
			city: form['city'].value || undefined,
			state: form['province'].value || undefined,
			postalCode: form['zip'].value || undefined,
			phoneNumber: form['phoneNumber'].value || undefined,
		};

		const orderName = form['orderName'].value;
		const shopifyOrderId = form['shopifyOrderId'].value;

		let fields: {
			cart: string;
			address: string;
			orderName: string;
			shopifyOrderId: string;
		} = {
			cart: JSON.stringify(cart),
			address: JSON.stringify(address),
			orderName: orderName,
			shopifyOrderId: shopifyOrderId,
		};

		submit(fields, {
			method: 'post',
			encType: 'application/x-www-form-urlencoded',
		});
	}

	function handleQtyChange(quantity, item) {
		const newCartItems = cart.map((cartItem) => {
			if (cartItem.id !== item.id) {
				return cartItem;
			} else {
				return {
					...cartItem,
					quantity: quantity,
				};
			}
		});

		setCart(newCartItems);
	}

	function handleChange(e, item: { id: string }) {
		if (e.target.checked) {
			setCart([...cart, item]);
		} else {
			setCart(cart.filter((cartItem) => cartItem.id !== item.id));
		}
	}

	function isAlreadyInCart(item: { id: string }, cart: any[]): boolean {
		return cart.find((cartItem) => cartItem.id === item.id) ? true : false;
	}

	function removeFromCart(item: { id: string }) {
		setCart(cart.filter((cartItem) => cartItem.id !== item.id));
		const checkbox = document.getElementById(item.id + '-checkbox');
		if (checkbox === null) return;
		checkbox.checked = false;
	}
}

function ResultsTable({ results, cart, handleChange, isAlreadyInCart }) {
	return (
		<table className="new-order-search-results min-w-full divide-y divide-gray-300 dark:divide-zinc-700">
			<thead>
				<tr>
					<th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-0">
						Vendor Names and No.
					</th>
					<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
						Edward Martin Names and Color
					</th>
					<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
						Vendor
					</th>
				</tr>
			</thead>

			<tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
				{results.map((item) => {
					const checked = isAlreadyInCart(item, cart);

					return (
						<tr key={item.id}>
							<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">
								<div className="relative flex items-start">
									<div className="flex h-6 items-center">
										<input
											id={`${item.id}-checkbox`}
											name="item"
											type="checkbox"
											className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
											onChange={(e) => {
												handleChange(e, item);
											}}
											value={item.id}
											defaultChecked={checked}
										/>
									</div>
									<div className="ml-3 text-sm leading-6">
										<label
											htmlFor={`${item.id}-checkbox`}
											className="bg-blue-300 font-medium text-gray-900 hover:cursor-pointer dark:text-white"
										>
											<span className="block">
												{item.materialNo}
											</span>
											<span
												id="comments-description"
												className="block text-gray-500 dark:text-zinc-400"
											>
												{item.seriesName} {item.color}
											</span>
										</label>
									</div>
								</div>
							</td>

							<td className="whitespace-nowrap px-3 py-4 text-sm">
								<label
									className="checkbox-label hover:cursor-pointer"
									htmlFor={`${item.id}-checkbox`}
								>
									<div className="cursor-pointer text-sm font-medium text-gray-900 dark:text-white">
										{item.seriesAlias}
									</div>
									<div className="cursor-pointer text-sm font-normal text-gray-500 dark:text-zinc-400">
										{item.colorAlias}
									</div>
								</label>
							</td>

							<td className="whitespace-nowrap px-3 py-4 text-sm">
								{item.vendor?.name}
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}
