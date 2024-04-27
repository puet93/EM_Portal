import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import {
	useActionData,
	useFetcher,
	useLoaderData,
	useNavigation,
	useSubmit,
} from '@remix-run/react';
import { prisma } from '~/db.server';
import { useEffect, useRef, useState } from 'react';
import type { RefObject, SyntheticEvent } from 'react';
import { EditIcon, SearchIcon, TrashIcon } from '~/components/Icons';
import Counter from '~/components/Counter';
import { badRequest } from '~/utils/request.server';

export const loader: LoaderFunction = async ({ params, request }) => {
	const orderId = params.orderId;
	if (typeof orderId !== 'string') {
		return redirect('/orders/new');
	}

	const order = await prisma.order.findUnique({
		where: {
			id: orderId,
		},
		include: {
			address: true,
			fulfillments: {
				include: {
					lineItems: {
						include: {
							orderLineItem: true,
						},
					},
				},
			},
			items: {
				include: {
					product: {
						include: {
							vendorProduct: {
								include: {
									sample: true,
								},
							},
						},
					},
				},
			},
		},
	});

	const items = order?.items.map((item) => {
		const newItem = { ...item.product, quantity: item.quantity };
		return newItem;
	});

	const mutatedOrder = { ...order, items };
	return json({ order: mutatedOrder, code: order });
};

export const action: ActionFunction = async ({ params, request }) => {
	const formData = await request.formData();
	const _action = formData.get('_action');

	switch (_action) {
		case 'clear': {
			return null;
		}
		case 'search': {
			return json({});
		}
		case 'delete': {
			return json({ errors: { form: 'Not yet implemented.' } });
		}
		default: {
			const cart = String(formData.get('cart'));
			const status = String(formData.get('status'));
			const errors: { cart?: string; form?: string; status?: string } =
				{};

			if (_action === 'clear') {
				return null;
			}

			if (typeof cart !== 'string' || cart.length === 0) {
				errors.cart = 'Unable to read cart.';
			}

			if (typeof status !== 'string' || status.length === 0) {
				errors.status = 'Unable to read status.';
			}

			const parsedStatus = JSON.parse(status);
			const parsedCart: { id: string; quantity: string }[] =
				JSON.parse(cart);

			const [, order] = await prisma.$transaction([
				prisma.orderItem.deleteMany({
					where: { orderId: params.orderId },
				}),
				prisma.order.update({
					where: { id: params.orderId },
					data: {
						status: parsedStatus,
						items: {
							create: parsedCart.map((item) => ({
								productId: item.id,
								quantity: Number(item.quantity),
							})),
						},
					},
					include: {
						address: true,
						items: {
							include: {
								product: {
									include: {
										vendorProduct: {
											include: {
												vendor: true,
											},
										},
									},
								},
							},
						},
						fulfillments: true,
					},
				}),
			]);

			const orderItems = order.items.filter(
				(item) => item.product.vendorProduct
			);

			/* ---------------- START ---------------- */

			// If no fulfillments:

			const fulfillments = {};

			// Take the item in the list
			orderItems.map((item) => {
				// Check to see if the vendor exists on the fulfillments object
				const vendorProduct = item.product.vendorProduct;
				const venderExists = fulfillments.hasOwnProperty(
					vendorProduct.vendorId
				);

				// If not, add vendor to the fulfillment object as a key and with a value of an empty array
				if (!venderExists) {
					fulfillments[vendorProduct.vendorId] = [];
				}

				// Add item to
				fulfillments[vendorProduct.vendorId].push(item);
			});

			console.log('FULFILLMENTS', fulfillments);

			/* ---------------- END ---------------- */

			// check if fulfillments exists
			if (order.fulfillments.length > 0) {
				console.log('FULFILLMENTS', order.fulfillments);
			}

			// Sort order items into fulfillments by vendor

			// Error guard
			if (Object.keys(errors).length !== 0) return badRequest({ errors });

			return json({ success: 'Draft updated.' });
		}
	}
};

export default function NewOrderDetailsPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const address = useFetcher();
	const search = useFetcher();
	const submit = useSubmit();
	const initialCart = data.order.items ?? [];
	const initialStatus = data.order.status ?? 'DRAFT';
	const [cart, setCart] = useState(initialCart);
	const [status, setStatus] = useState(initialStatus);
	const [isEditing, setIsEditing] = useState(false);

	useEffect(() => {
		if (address.state === 'idle' && address.data == null) {
			setIsEditing(false);
		}
	}, [address]);

	const masterCheckboxRef = useRef(null) as RefObject<HTMLInputElement>;
	const tableBodyRef = useRef(null) as RefObject<HTMLTableSectionElement>;

	function getCheckboxes() {
		if (!tableBodyRef.current) return;
		const checkboxes: NodeListOf<HTMLInputElement> =
			tableBodyRef.current.querySelectorAll('input[type="checkbox"]');
		return checkboxes;
	}

	function handleMasterCheckboxChange(e: SyntheticEvent<HTMLInputElement>) {
		const checkboxes = getCheckboxes();

		console.log('CHECKBOXES', checkboxes);
		if (!checkboxes) return;
		for (let i = 0; i < checkboxes.length; i++) {
			if (e.currentTarget.checked) {
				checkboxes[i].checked = true;
			} else {
				checkboxes[i].checked = false;
			}
		}
	}

	function handleDiscard() {
		setCart(initialCart);
		setStatus(initialStatus);
		search.submit(
			{ _action: 'clear' },
			{
				replace: true,
				method: 'post',
				action: `/orders/new/${data.order.id}`,
			}
		);
	}

	function handleSubmit() {
		submit(
			{ cart: JSON.stringify(cart), status: JSON.stringify(status) },
			{
				method: 'post',
				encType: 'application/x-www-form-urlencoded',
			}
		);
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

	function handleEditClick() {
		setIsEditing(!isEditing);
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

	return (
		<>
			<header className="page-header">
				{data?.order?.name ? (
					<h1 className="headline-h3">Order {data.order.name}</h1>
				) : (
					<h1 className="headline-h3">Order {data.order.id}</h1>
				)}
			</header>

			<div className="foobar">
				<section className="foobar-main-content">
					<h2 className="headline-h6">Search for items</h2>
					<search.Form method="post" action="/search" replace>
						<div className="search-bar">
							<SearchIcon
								className="search-icon"
								id="search-icon"
							/>
							<input
								aria-labelledby="search-icon"
								className="search-input"
								type="search"
								name="query"
								id="query"
								placeholder="Search"
								autoComplete="off"
							/>

							<button
								className="button"
								type="submit"
								name="_action"
								value="search"
							>
								Search
							</button>
						</div>
					</search.Form>

					{data.order ? (
						<code>{JSON.stringify(data.order, null, 4)}</code>
					) : null}

					{search.data ? (
						search.data.results ? (
							<table className="new-order-search-results">
								<thead>
									<tr>
										<th>
											<input
												ref={masterCheckboxRef}
												id="master-checkbox"
												type="checkbox"
												onChange={
													handleMasterCheckboxChange
												}
											/>
										</th>
										<th>Product</th>
										<th>Florim Item No.</th>
										<th>Material No.</th>
									</tr>
								</thead>
								<tbody ref={tableBodyRef}>
									{search.data.results.map(
										(item: {
											id: string;
											title: string;
											sku: string;
											vendorProduct: { itemNo: string };
										}) => {
											const checked = isAlreadyInCart(
												item,
												cart
											);

											return (
												<tr key={item.id}>
													<td>
														<input
															id={`${item.id}-checkbox`}
															type="checkbox"
															onChange={(e) => {
																handleChange(
																	e,
																	item
																);
															}}
															defaultChecked={
																checked
															}
														/>
													</td>
													<td>
														<label
															className="checkbox-label"
															htmlFor={`${item.id}-checkbox`}
														>
															<div className="title">
																{item.title}
															</div>
															<div className="caption">
																{item.sku}
															</div>
														</label>
													</td>
													<td>
														{
															item.vendorProduct
																.itemNo
														}
													</td>
													<td>
														{item.vendorProduct
															.sample
															? item.vendorProduct
																	.sample
																	.materialNo
															: null}
													</td>
												</tr>
											);
										}
									)}
								</tbody>
							</table>
						) : (
							<div>No results</div>
						)
					) : null}
				</section>

				<aside className="foobar-sidebar sample-cart">
					<h2 className="headline-h6">Selected Samples</h2>

					<div className="sample-cart-actions">
						<button
							className={
								navigation.state !== 'submitting'
									? 'primary button full-width'
									: 'deactive button full-width'
							}
							disabled={navigation.state === 'submitting'}
							onClick={handleSubmit}
						>
							{navigation.state === 'submitting'
								? 'Saving...'
								: 'Save'}
						</button>

						<button onClick={handleDiscard} className="button">
							Discard Changes
						</button>
					</div>

					<div className="input">
						<label htmlFor="status">Status</label>
						<select
							name="status"
							id="status"
							value={status}
							onChange={(e) => {
								setStatus(e.target.value);
							}}
						>
							<option value="DRAFT">Draft</option>
							<option value="NEW">New</option>
							<option value="PROCESSING">Processing</option>
							<option value="COMPLETE">Complete</option>
							<option value="CANCELLED">Cancelled</option>
						</select>
					</div>

					<div className="shipping-info">
						<header className="shipping-info-header">
							<h2 className="headline-h6">Ship To</h2>

							{isEditing ? (
								<button
									className="close-button"
									onClick={() => {
										setIsEditing(false);
									}}
								>
									Cancel
								</button>
							) : (
								<button
									className="icon-button"
									aria-label="Edit address"
									onClick={handleEditClick}
								>
									<EditIcon />
								</button>
							)}
						</header>

						{isEditing ? (
							<address.Form
								method="post"
								action={`/api/addresses/${data.order.address.id}`}
							>
								<div className="input input--sm">
									<label htmlFor="name">Name</label>
									<input
										type="text"
										autoComplete="name"
										id="name"
										name="line1"
										defaultValue={data.order.address.line1}
									/>
								</div>

								<div className="input input--sm">
									<label htmlFor="address-line1">
										Street Address
									</label>
									<input
										type="text"
										autoComplete="address-line1"
										id="address-line1"
										name="line2"
										defaultValue={data.order.address.line2}
									/>
								</div>

								<div className="input input--sm">
									<label htmlFor="address-line2">
										Suite, Unit, Apt #
									</label>
									<input
										type="text"
										autoComplete="address-line2"
										id="address-line2"
										name="line3"
										defaultValue={data.order.address.line3}
									/>
								</div>

								<div className="input input--sm">
									<label htmlFor="address-level2">City</label>
									<input
										type="text"
										id="address-level2"
										autoComplete="address-level2"
										name="city"
										defaultValue={data.order.address.city}
									/>
								</div>

								<div className="input input--sm">
									<label htmlFor="address-level1">
										State
									</label>
									<input
										type="text"
										id="address-level1"
										autoComplete="address-level1"
										name="state"
										defaultValue={data.order.address.state}
									/>
								</div>

								<div className="input input--sm">
									<label htmlFor="postal-code">
										ZIP Code
									</label>
									<input
										type="text"
										id="postal-code"
										autoComplete="postal-code"
										name="postalCode"
										defaultValue={
											data.order.address.postalCode
										}
									/>
								</div>

								{address.state === 'submitting' ? (
									<button
										type="submit"
										className="deactive button full-width"
										disabled
									>
										Saving...
									</button>
								) : (
									<button
										type="submit"
										className="primary button full-width"
									>
										Save
									</button>
								)}
							</address.Form>
						) : null}

						{!isEditing ? (
							<address>
								{data.order.address.line1}
								<br />
								{data.order.address.line2}
								<br />
								{data.order.address.line3 ? (
									<>
										{data.order.address.line3}
										<br />
									</>
								) : null}
								{`${data.order.address.city}, ${data.order.address.state} ${data.order.address.postalCode}`}
							</address>
						) : null}

						{actionData?.success ? (
							<div className="success message">
								{actionData.success}
							</div>
						) : null}
					</div>

					<ul className="sample-cart-list">
						{cart.map(
							(item: {
								id: string;
								sku: string;
								title: string;
								quantity: number;
							}) => {
								if (!item.quantity) {
									item.quantity = 1;
								}

								return (
									<li
										className="sample-cart-item"
										key={item.id}
									>
										<div className="sample-cart-item__description">
											<div className="">{item.title}</div>
											<div className="caption">
												{item.sku}
											</div>
										</div>

										<Counter
											min={1}
											name={`quantity-${item.sku}`}
											onChange={(quantity) => {
												handleQtyChange(quantity, item);
											}}
											defaultValue={item.quantity}
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
								);
							}
						)}
					</ul>
				</aside>
			</div>
		</>
	);
}
