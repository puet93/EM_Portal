import { json } from '@remix-run/node';
import {
	Form,
	Link,
	useActionData,
	useFetcher,
	useLoaderData,
	useNavigation,
} from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { prisma } from '~/db.server';

import {
	Description,
	Field,
	Label,
	Menu,
	MenuButton,
	MenuItem,
	MenuItems,
} from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

import { badRequest } from '~/utils/request.server';
import { normalizeStateInput } from '~/utils/us-states';
import { requireUser } from '~/session.server';
import { TrashIcon } from '~/components/Icons';
import { parseISO, format } from 'date-fns';
import { Button, CopyButton } from '~/components/Buttons';
import { Input, Select } from '~/components/Input';
import { ShippingLabelForm } from '~/components/ShippingForms';

import type { FulfillmentStatus } from '@prisma/client';
import type { ActionFunction, LoaderFunctionArgs } from '@remix-run/node';
import { createFulfillment } from '~/utils/shopify.server';

const menuItemButtonStyle =
	'block w-full px-4 py-2 text-left text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900 dark:text-white dark:data-[focus]:bg-sky-600';

const menuItemsStyle =
	'absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in dark:divide-white/5 dark:bg-zinc-800';

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	const user = await requireUser(request);

	const fulfillmentId = params.fulfillmentId;
	const fulfillment = await prisma.fulfillment.findUnique({
		where: {
			id: fulfillmentId,
			vendorId: {
				// TODO: user vendor check
			},
		},
		include: {
			comments: {
				include: { user: true },
				orderBy: {
					createdAt: 'desc',
				},
			},
			order: {
				select: {
					name: true,
					address: true,
				},
			},
			lineItems: {
				include: {
					orderLineItem: {
						include: {
							sample: true,
						},
					},
				},
			},
			trackingInfo: true,
			vendor: true,
		},
	});

	if (!fulfillment) {
		throw new Response('Error from the Fulfillment Detail page.', {
			status: 404,
		});
	}

	const comments =
		fulfillment?.comments && fulfillment.comments.length > 0
			? fulfillment.comments
			: [];

	return json({ fulfillment, comments, user });
};

export const action: ActionFunction = async ({ params, request }) => {
	const user = await requireUser(request);

	const formData = await request.formData();
	const _action = formData.get('_action');

	switch (_action) {
		case 'comment': {
			const comment = formData.get('comment');
			if (typeof comment !== 'string' || comment.length === 0) {
				return badRequest({ message: 'Invalid request' });
			}

			await prisma.comment.create({
				data: {
					content: comment,
					fulfillmentId: params.fulfillmentId,
					userId: user.id,
				},
			});

			return json({ success: 'Comment' });
		}
		case 'comment delete': {
			const commentId = formData.get('commentId');

			if (typeof commentId !== 'string' || commentId.length === 0) {
				return badRequest({ message: 'Invalid request' });
			}

			await prisma.comment.delete({
				where: { id: Number(commentId) },
			});

			return json({ success: 'Comment' });
		}
		case 'update status': {
			const status = formData.get('status');
			if (typeof status !== 'string' || status.length === 0) {
				return badRequest({ message: 'Invalid request' });
			}

			await prisma.fulfillment.update({
				where: { id: params.fulfillmentId },
				data: { status: status as FulfillmentStatus },
			});
			return json({ success: 'Status updated' });
		}
		case 'save': {
			const fulfillment = await prisma.fulfillment.findUnique({
				where: { id: params.fulfillmentId },
				include: {
					trackingInfo: true,
				},
			});
			if (!fulfillment)
				return badRequest({ errors: { form: 'Invalid request' } });

			const trackingNumber = formData.get('trackingNumber');
			const shippingCarrier = formData.get('shippingCarrier');

			if (
				typeof trackingNumber !== 'string' ||
				trackingNumber.length == 0
			) {
				if (fulfillment.trackingInfo)
					await prisma.trackingInfo.delete({
						where: { fulfillmentId: params.fulfillmentId },
					});

				return json({ success: 'Tracking info deleted.' });
			}

			if (
				typeof shippingCarrier !== 'string' ||
				shippingCarrier.length == 0
			) {
				return badRequest({ errors: 'Invalid shipping carrier' });
			}

			await prisma.fulfillment.update({
				where: { id: params.fulfillmentId },
				data: {
					trackingInfo: {
						upsert: {
							update: {
								number: trackingNumber,
								company: shippingCarrier,
							},
							create: {
								number: trackingNumber,
								company: shippingCarrier,
							},
						},
					},
				},
			});

			if (fulfillment.shopifyFulfillmentOrderId) {
				// TODO: Check to see if fulfillmentOrder is closed

				let trackingUrl = '';

				if (shippingCarrier.toLowerCase() === 'fedex') {
					trackingUrl = `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
				} else if (shippingCarrier.toLowerCase() === 'ups') {
					trackingUrl = `https://www.ups.com/WebTracking?loc=en_US&requester=ST&trackNums=${trackingNumber}`;
				} else {
					trackingUrl = '';
				}

				try {
					await createFulfillment(
						fulfillment.shopifyFulfillmentOrderId,
						false,
						{
							company: shippingCarrier,
							number: trackingNumber,
							url: trackingUrl,
						}
					);
				} catch (error) {
					console.log('Unable to update tracking info on Shopify.');
					console.log(error);
				}
			}

			return json({ success: 'Saved!' });
		}
		case 'complete': {
			return json({ success: 'Saved and completed!' });
		}
		case 'archive': {
			await prisma.fulfillment.update({
				where: { id: params.fulfillmentId },
				data: { isArchived: true },
			});

			return json({ success: 'Fulfillment archived' });
		}
		case 'unarchive': {
			await prisma.fulfillment.update({
				where: { id: params.fulfillmentId },
				data: { isArchived: false },
			});

			return json({ success: 'Fulfillment un-archived' });
		}
		default:
			return badRequest({ errors: { form: 'Unsupported action' } });
	}
};

export default function OrderPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const [isEditing, setIsEditing] = useState(
		!data.fulfillment.trackingInfo?.number ||
			!data.fulfillment.trackingInfo?.company
	);

	const fulfillment = data.fulfillment;
	const order = fulfillment.order;
	const address = order.address;

	useEffect(() => {
		if (
			navigation.state === 'loading' &&
			navigation.formMethod === 'POST'
		) {
			setIsEditing(false);
		}
	}, [navigation]);

	const handleCancelClick = () => {
		setIsEditing(false);
	};

	const formatOrderDetails = (): string => {
		const orderNo = `Order No. ${data.fulfillment.order.name}\n\n`;

		const items = data.fulfillment.lineItems
			.map((item) => {
				const sample = item.orderLineItem.sample;
				const vendorProductDescription =
					sample.vendorTitle ||
					`${sample.seriesName} ${sample.finish} ${sample.color}`;
				const productDescription =
					sample.title ||
					`${sample.seriesAlias} ${sample.finish} ${sample.colorAlias}`;
				return `- ${item.orderLineItem.quantity} qty. ${vendorProductDescription} : ${productDescription}`.trim();
			})
			.join('\n');

		const abbreviatedState = address.state
			? normalizeStateInput(address.state)
			: '';

		const addressString = [
			address.line1 || '',
			address.line2 || '',
			address.line3 || '',
			address.line4 || '',
			`${address.city || ''}${
				address.city && abbreviatedState ? ', ' : ''
			}${address.state || ''} ${address.postalCode || ''}`,
		]
			.filter((line) => line.trim() !== '') // Remove any empty lines
			.join('\n');

		const trackingInfo = [
			data.fulfillment.trackingInfo?.number || '',
			data.fulfillment.trackingInfo?.company || '',
		]
			.filter((line) => line.trim() !== '') // Remove any empty lines
			.join('\n');

		return `${orderNo}${items}\n\nShip to\n\n${addressString}\n\n${trackingInfo}`.trim();
	};

	const handleCopyToClipboard = (): void => {
		const text = formatOrderDetails();
		navigator.clipboard.writeText(text).then(
			() => {
				alert('Order details copied to clipboard!');
			},
			(err) => {
				console.error('Failed to copy: ', err);
			}
		);
	};

	return (
		<div className="mx-auto max-w-7xl">
			<header className="page-header">
				<div className="page-header__row">
					<h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:tracking-tight">
						{data?.fulfillment?.name
							? data.fulfillment.name
							: 'Sample Order'}
					</h1>
					
					{data?.fulfillment?.shopifyFulfillmentOrderId ? (
						<p>{data.fulfillment.shopifyFulfillmentOrderId}</p>
					) : null}

					<div className="gap-x ml-auto flex items-center gap-x-4">
						{/* Experimental Menu */}
						{data.user.role === 'SUPERADMIN' && (
							<Menu
								as="div"
								className="relative inline-block text-left"
							>
								<div>
									<MenuButton className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-zinc-900 dark:text-white dark:ring-white/10 dark:hover:bg-white/20">
										Menu
										<ChevronDownIcon
											aria-hidden="true"
											className="-mr-1 h-5 w-5 text-gray-400"
										/>
									</MenuButton>
								</div>

								<MenuItems
									transition
									className={menuItemsStyle}
								>
									<div className="py-1">
										<MenuItem>
											<button
												type="button"
												className={menuItemButtonStyle}
											>
												Print shipping label
											</button>
										</MenuItem>
									</div>
									<div className="py-1">
										<MenuItem>
											<a
												href="/orders/new"
												type="button"
												className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900 dark:text-white dark:data-[focus]:bg-sky-600"
											>
												Create new order
											</a>
										</MenuItem>
									</div>
									<div className="py-1">
										<MenuItem>
											<button
												type="button"
												className={menuItemButtonStyle}
											>
												Archive
											</button>
										</MenuItem>
										<MenuItem>
											<button
												type="button"
												className={menuItemButtonStyle}
											>
												Delete
											</button>
										</MenuItem>
									</div>
								</MenuItems>
							</Menu>
						)}

						<div className="inline-flex rounded-md shadow-sm">
							<Link
								to="labels"
								target="_blank"
								rel="noopener noreferrer"
								className="relative inline-flex items-center rounded-l-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-sky-700 hover:bg-sky-500 focus:z-10 dark:bg-sky-500 dark:ring-sky-600 dark:hover:bg-sky-400"
							>
								Print Labels
							</Link>
							<Menu as="div" className="relative -ml-px block">
								<MenuButton className="relative inline-flex items-center rounded-r-md bg-sky-600 px-2 py-2 text-sky-200 ring-1 ring-inset ring-sky-700 hover:bg-sky-500 focus:z-10 dark:bg-sky-500 dark:text-sky-700 dark:ring-sky-600 dark:hover:bg-sky-400">
									<span className="sr-only">
										Open options
									</span>
									<ChevronDownIcon
										aria-hidden="true"
										className="h-5 w-5"
									/>
								</MenuButton>
								<MenuItems
									transition
									className="absolute right-0 z-10 -mr-1 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
								>
									<div className="py-1">
										<MenuItem>
											<Link
												to="pick-ticket"
												target="_blank"
												rel="noopener noreferrer"
												className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900"
											>
												Print pick ticket
											</Link>
										</MenuItem>

										{/* <MenuItem>
											<Link
												to="labels"
												target="_blank"
												rel="noopener noreferrer"
												className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100 data-[focus]:text-gray-900"
												reloadDocument
											>
												Print labels
											</Link>
										</MenuItem> */}
									</div>
								</MenuItems>
							</Menu>
						</div>
					</div>
				</div>

				<div className="mt-1">
					<span className="text-sm font-normal text-gray-500 dark:text-zinc-400">
						{data?.fulfillment?.vendor?.name}
					</span>
					{data.fulfillment?.isArchived ? (
						<span className="text-sm font-normal text-gray-500 dark:text-zinc-400">
							{' '}
							| Archived
						</span>
					) : null}
				</div>
			</header>

			<div className="foobar">
				<div className="foobar-main-content">
					<div className="overflow-hidden rounded-lg ring-1 ring-white ring-opacity-5">
						<table className="min-w-full divide-y divide-gray-300 dark:divide-zinc-700">
							<thead>
								<tr>
									<th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
										Material No.
									</th>
									<th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
										Description
									</th>
									<th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white">
										Quantity
									</th>
								</tr>
							</thead>

							<tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
								{data.fulfillment?.lineItems.map((item) => {
									const sample = item.orderLineItem.sample;
									return (
										<tr key={item.id}>
											<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
												{data.user.role ===
												'SUPERADMIN' ? (
													<Link
														to={`/samples/${sample.id}`}
													>
														{sample.materialNo}
													</Link>
												) : (
													<span>
														{sample.materialNo}
													</span>
												)}
											</td>
											<td className="whitespace-nowrap px-3 py-4 text-sm">
												<p className="text-sm text-gray-900 dark:text-white">
													{sample.vendorTitle
														? sample.vendorTitle
														: `${sample.seriesName} ${sample.finish} ${sample.color}`}
												</p>

												<p className="mt-1 text-xs font-normal leading-6 text-gray-500 dark:text-zinc-400">
													{sample.title
														? sample.title
														: `${sample.seriesAlias} ${sample.finish} ${sample.colorAlias}`}
												</p>
											</td>
											<td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
												{item.orderLineItem.quantity}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					<h3 className="mt-10 text-base font-medium text-gray-900 dark:text-white">
						Comments
					</h3>

					<div className="my-6">
						<CommentForm />
					</div>

					{data.comments.length > 0 ? (
						<ul className="space-y-6">
							{data.comments.map((comment, index) => (
								<Comment
									key={comment.id}
									comment={comment}
									isEnd={index === data.comments.length - 1}
								/>
							))}
						</ul>
					) : null}
				</div>

				<div className="foobar-sidebar flex flex-col gap-y-6">
					<section className="rounded-lg bg-gray-100 p-6 dark:bg-zinc-800">
						<div>
							<h3 className="text-sm font-semibold leading-4 text-gray-900 dark:text-white">
								Order Status
							</h3>

							<Form
								method="post"
								className="gap-x mt-2 flex items-center gap-x-4"
							>
								<Select
									id="status"
									name="status"
									options={[
										{ label: 'New', value: 'NEW' },
										{
											label: 'Processing',
											value: 'PROCESSING',
										},
										{
											label: 'Complete',
											value: 'COMPLETE',
										},
										{
											label: 'Cancelled',
											value: 'CANCELLED',
										},
										{ label: 'Error', value: 'ERROR' },
									]}
									defaultValue={data.fulfillment?.status}
								/>

								<Button
									type="submit"
									name="_action"
									value="update status"
								>
									{navigation.state === 'submitting'
										? 'Saving...'
										: 'Save'}
								</Button>
							</Form>
						</div>
					</section>

					<section className="rounded-lg bg-gray-100 p-6 dark:bg-zinc-800">
						<div>
							<div className="flex items-baseline justify-between gap-x-3">
								<h3 className="text-sm font-semibold leading-4 text-gray-900 dark:text-white">
									Ship To
								</h3>

								{/* {data.user.role === 'SUPERADMIN' && (
									<button
										type="button"
										className="text-sm font-normal leading-4 text-sky-600"
										onClick={handleCopyToClipboard}
									>
										Copy
									</button>
								)} */}

								{data.user.role === 'SUPERADMIN' && (
									<button
										type="button"
										className="text-sm font-normal leading-4 text-sky-600"
										onClick={() => setIsEditingAddress(!isEditingAddress)}
									>
										Edit
									</button>
								)}
							</div>

							{address ? (
								<>
									<address className="mt-2 text-sm not-italic leading-6 text-gray-500 dark:text-zinc-400">
										{address.line1 && `${address.line1}\n`}
										{address.line2 && `${address.line2}\n`}
										{address.line3 && `${address.line3}\n`}
										{address.line4 && `${address.line4}\n`}
										{address.city}, {address.state}{' '}
										{address.postalCode}
									</address>

									{address.phoneNumber ? (
										<div className="-mr-1 mt-2 flex items-center gap-x-3">
											<div className="grow text-sm not-italic leading-6 text-gray-500 dark:text-zinc-400">
												{formatPhoneNumber(
													address.phoneNumber
												)}
											</div>

											<CopyButton
												text={address.phoneNumber}
												label="Copy phone number"
												successLabel="Copied phone!"
											/>
										</div>
									) : null}
								</>
							) : null}
						</div>

						<div className="mt-6">
							<div className="flex items-baseline justify-between gap-x-3">
								<h3 className="text-sm font-semibold leading-4 text-gray-900 dark:text-white">
									Tracking Info
								</h3>

								<button
									className="text-sm font-normal leading-4 text-sky-600"
									type="button"
									onClick={() => setIsEditing(!isEditing)}
								>
									Edit
								</button>
							</div>

							{isEditing && (
								<TrackingForm
									initialCarrier={
										data.fulfillment.trackingInfo?.company
											? data.fulfillment.trackingInfo
													.company
											: ''
									}
									initialTrackingNumber={
										data.fulfillment.trackingInfo?.number
											? data.fulfillment.trackingInfo
													.number
											: ''
									}
									handleCancelClick={handleCancelClick}
								/>
							)}

							{!isEditing && (
								<div className="mt-4">
									<div className="text-sm leading-6 text-gray-500 dark:text-zinc-400">
										{data.fulfillment.trackingInfo
											?.number ? (
											data.fulfillment.trackingInfo.number
										) : (
											<span className="italic text-zinc-600">
												No tracking number
											</span>
										)}
									</div>

									<div className="text-sm leading-6 text-gray-500 dark:text-zinc-400">
										{data.fulfillment.trackingInfo
											?.company ? (
											data.fulfillment.trackingInfo
												.company
										) : (
											<span className="italic text-zinc-600">
												No shipping carrier
											</span>
										)}
									</div>

									<div className="text-sm leading-6 text-sky-600">
										{data.fulfillment.trackingInfo?.labelUrl ? (
											<a href={data.fulfillment.trackingInfo.labelUrl}>Download</a>
										) : (
											<span className="italic text-zinc-600">
												No shipping carrier
											</span>
										)}
									</div>
								</div>
							)}
						</div>

						{actionData?.errors?.form ? (
							<div className="error message">
								{actionData.errors.form}
							</div>
						) : null}
					</section>

					{data.user.role === 'SUPERADMIN' ? (
						<Form
							method="post"
							className="rounded-lg bg-gray-100 p-6 dark:bg-zinc-800"
						>
							<Toggle />

							<div className="mt-4">
								{data.fulfillment &&
								data.fulfillment.isArchived ? (
									<Button
										size="xs"
										type="submit"
										name="_action"
										value="unarchive"
									>
										Unarchive
									</Button>
								) : (
									<Button
										size="xs"
										type="submit"
										name="_action"
										value="archive"
									>
										Archive
									</Button>
								)}
							</div>
						</Form>
					) : null}
				</div>
			</div>

			{data.user.role === 'SUPERADMIN' ? (
				<div className="mt-12 border-t border-gray-900/10 pt-12 dark:border-white/10">
					<ShippingLabelForm
						fullName={address?.line1 || undefined}
						addressLine1={address?.line2 || undefined}
						addressLine2={address?.line3 || undefined}
						city={address?.city || undefined}
						state={address?.state || undefined}
						zip={address?.postalCode || undefined}
						phone={address?.phoneNumber || undefined}
						orderNo={order.name || undefined}
						vendorName={fulfillment.vendor?.name || undefined}
					/>
				</div>
			) : null}
		</div>
	);
}

function Comment({ comment, isEnd }: { comment: any; isEnd: boolean }) {
	let fetcher = useFetcher();
	let isDeleting = fetcher.state === 'submitting';

	const date = parseISO(comment.createdAt);
	const formattedDate = format(date, 'MMM d h:mm a');
	const className = isEnd
		? 'absolute left-0 top-0 flex w-6 justify-center'
		: 'absolute top-3 -bottom-10 left-0 top-0 flex w-6 justify-center';

	return (
		<>
			<li className="relative flex gap-x-4">
				<div className={className}>
					<div className="w-px bg-gray-200 dark:bg-zinc-700"></div>
				</div>

				<span className="relative mt-3 inline-block h-6 w-6 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-700">
					<svg
						className="h-full w-full text-gray-300 dark:text-zinc-800"
						fill="currentColor"
						viewBox="0 0 24 24"
					>
						<path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
					</svg>
				</span>

				<div className="flex flex-auto gap-x-3 rounded-md p-3 ring-1 ring-inset ring-gray-200 dark:ring-white/5">
					<div className="grow">
						<div className="flex justify-between gap-x-4">
							<div className="py-0.5 text-xs leading-5">
								<span className="font-medium text-gray-900 dark:text-white">
									{comment.user.firstName}{' '}
									{comment.user.lastName}
								</span>{' '}
								<time
									dateTime={comment.createdAt}
									className="flex-none py-0.5 text-xs leading-5 text-gray-500 dark:text-zinc-400"
								>
									{formattedDate}
								</time>
							</div>
						</div>
						<p className="text-sm font-light leading-6 text-gray-500 dark:text-white">
							{comment.content}
						</p>
					</div>

					<fetcher.Form method="post" className="shrink-0">
						<input
							name="commentId"
							value={comment.id}
							type="hidden"
						/>

						<button
							type="submit"
							name="_action"
							value="comment delete"
							disabled={isDeleting}
							className="items-center rounded-md bg-transparent px-1 py-1 text-sm font-semibold text-gray-400 transition-colors hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:text-zinc-600 dark:hover:bg-zinc-950 dark:hover:text-white md:inline-flex"
						>
							<span className="sr-only">Delete comment</span>
							<TrashIcon />
						</button>
					</fetcher.Form>
				</div>
			</li>
		</>
	);
}

function CommentAvatar() {
	return (
		<span className="inline-block h-6 w-6 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
			<svg
				className="h-full w-full text-gray-300 dark:text-zinc-600"
				fill="currentColor"
				viewBox="0 0 24 24"
			>
				<path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
			</svg>
		</span>
	);
}

function CommentForm() {
	const fetcher = useFetcher();
	const formRef = useRef<HTMLFormElement>(null);
	const isPosting = fetcher.state === 'submitting';

	useEffect(() => {
		if (!isPosting) {
			formRef.current?.reset();
		}
	});

	return (
		<>
			<div className="flex gap-x-3">
				<CommentAvatar />

				<fetcher.Form
					action="#"
					className="relative flex-auto"
					method="post"
					ref={formRef}
				>
					<div className="overflow-hidden rounded-lg pb-12 shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-indigo-600 dark:bg-white/5 dark:ring-white/10">
						<label htmlFor="comment" className="sr-only">
							Add your comment
						</label>
						<textarea
							rows={4}
							name="comment"
							id="comment"
							className="block w-full resize-none border-0 bg-transparent py-1.5 text-gray-900 placeholder:text-gray-400 focus:ring-0 dark:text-white dark:placeholder:text-zinc-500 sm:text-sm sm:leading-6"
							placeholder="Add your comment..."
						></textarea>
					</div>

					<div className="absolute inset-x-0 bottom-0 flex justify-end py-2 pl-3 pr-2">
						<Button
							size="md"
							name="_action"
							value="comment"
							type="submit"
							color="primary"
						>
							{isPosting ? 'Posting...' : 'Comment'}
						</Button>
					</div>
				</fetcher.Form>
			</div>
		</>
	);
}

function Toggle() {
	// const [enabled, setEnabled] = useState(false);

	return (
		<Field className="flex items-center justify-between gap-x-5">
			<span className="flex flex-grow flex-col">
				<Label
					as="span"
					passive
					className="text-sm font-semibold leading-4 text-gray-900 dark:text-white"
				>
					Archive fulfillment order
				</Label>
				<Description
					as="span"
					className="mt-2 text-sm font-normal leading-6 text-gray-500 dark:text-zinc-400"
				>
					Archiving an order will prevent the order from showing up on
					the order pages. This helps clear the workspace clear of
					fulfilled orders.
					{/* The toggle doesn't work right now. Use the button instead. */}
				</Description>
			</span>
			{/* <Switch
				checked={enabled}
				onChange={setEnabled}
				className="group relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 data-[checked]:bg-indigo-600"
			>
				<span
					aria-hidden="true"
					className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out group-data-[checked]:translate-x-5"
				/>
			</Switch> */}
		</Field>
	);
}

function TrackingForm({
	initialTrackingNumber,
	initialCarrier,
	handleCancelClick,
}: {
	initialTrackingNumber: string;
	initialCarrier: string;
	handleCancelClick: () => void;
}) {
	const [trackingNumber, setTrackingNumber] = useState<string>(
		initialTrackingNumber
	);
	const [carrier, setCarrier] = useState<string>(initialCarrier);

	const handleTrackingNumberChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const value = event.target.value;
		setTrackingNumber(value);

		// Detect the carrier and update the carrier field
		const detectedCarrier = detectCarrier(value);
		setCarrier(detectedCarrier);
	};

	const trackingNumberRef = useRef<HTMLInputElement>(null);
	useEffect(() => {
		trackingNumberRef.current?.focus();
		trackingNumberRef.current?.select();
	}, []);

	return (
		<Form method="post" className="mt-4 flex flex-col gap-y-3">
			<div>
				<label className="sr-only">Tracking number</label>
				<input
					ref={trackingNumberRef}
					type="text"
					name="trackingNumber"
					placeholder="Tracking number"
					value={trackingNumber}
					onChange={handleTrackingNumberChange}
					className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:placeholder:text-zinc-600 dark:focus:ring-sky-500 sm:text-sm sm:leading-6"
				/>
			</div>

			<div>
				<label className="sr-only">Shipping carrier</label>
				<Select
					id="shippingCarrier"
					name="shippingCarrier"
					hasBlankOption
					value={carrier}
					onChange={(e) => setCarrier(e.target.value)}
					options={[
						{ value: 'FedEx', label: 'FedEx' },
						{ value: 'UPS', label: 'UPS' },
					]}
				/>
			</div>

			<div className="mt-1 flex justify-start gap-x-3">
				<Button
					color="primary"
					size="xs"
					type="submit"
					name="_action"
					value="save"
				>
					Save
				</Button>

				<Button size="xs" onClick={handleCancelClick}>
					Cancel
				</Button>
			</div>
		</Form>
	);
}

function detectCarrier(trackingNumber: string): string {
	const cleanedTrackingNumber = trackingNumber.replace(/[\s-]/g, '');

	const fedexRegex = /^(96\d{20}|\d{15}|\d{12}|\d{20})$/;
	const upsRegex = /^1Z[0-9A-Z]{16}$/i;
	const uspsRegex = /^(\d{20}|\d{22}|[A-Z]{2}\d{9}[A-Z]{2})$/i;

	if (fedexRegex.test(cleanedTrackingNumber)) {
		return 'FedEx';
	} else if (upsRegex.test(cleanedTrackingNumber)) {
		return 'UPS';
	} else if (uspsRegex.test(cleanedTrackingNumber)) {
		return 'USPS';
	} else {
		return '';
	}
}

function formatPhoneNumber(phoneNumber: string): string {
	// Ensure the input is a 10-digit number
	if (phoneNumber.length !== 10) {
		return phoneNumber; // Return as is if not 10 digits
	}

	// Format as `123-456-7890`
	return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(
		3,
		6
	)}-${phoneNumber.slice(6)}`;
}

export function ErrorBoundary() {
	return <div>Error Boundary Component</div>;
}
