import type { ActionFunction, LoaderFunctionArgs } from '@remix-run/node';
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
import Dropdown from '~/components/Dropdown';
import { badRequest } from '~/utils/request.server';
import type { FulfillmentStatus } from '@prisma/client';
import { requireUser } from '~/session.server';
import { TrashIcon } from '~/components/Icons';

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	await requireUser(request);
	const fulfillmentId = params.fulfillmentId;

	// if (typeof fulfillmentId !== 'string' || fulfillmentId.length === 0) {
	// 	return badRequest({ message: 'Invalid request' });
	// }

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

	const comments =
		fulfillment?.comments && fulfillment.comments.length > 0
			? fulfillment.comments
			: null;

	return json({ fulfillment, comments });
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
			return json({ success: 'Saved!' });
		}
		case 'complete': {
			return json({ success: 'Saved and completed!' });
		}
		default:
			return badRequest({ errors: { form: 'Unsupported action' } });
	}
};

export default function OrderPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const isSaving = navigation.state === 'submitting';
	const [isEditing, setIsEditing] = useState(false);
	const trackingNumberRef = useRef(null);

	useEffect(() => {
		if (!isSaving) {
			setIsEditing(false);
		}
	}, [isSaving]);

	useEffect(() => {
		if (isEditing) {
			trackingNumberRef.current?.focus();
			trackingNumberRef.current?.select();
		}
	}, [isEditing]);

	return (
		<>
			<header className="page-header">
				<div className="page-header__row">
					<h1 className="headline-h5">
						{data?.fulfillment?.name
							? data.fulfillment.name
							: 'Sample Order'}
					</h1>

					<div className="page-header__actions">
						<Form method="post" className="inline-form">
							<Dropdown
								name="status"
								options={[
									{ label: 'New', value: 'NEW' },
									{
										label: 'Processing',
										value: 'PROCESSING',
									},
									{ label: 'Complete', value: 'COMPLETE' },
									{ label: 'Cancelled', value: 'CANCELLED' },
									{ label: 'Error', value: 'ERROR' },
								]}
								defaultValue={data.fulfillment?.status}
							/>
							<button
								className="button"
								type="submit"
								name="_action"
								value="update status"
							>
								Save
							</button>
						</Form>

						<Link
							className="primary button"
							to="labels"
							target="_blank"
							reloadDocument
						>
							Print Labels
						</Link>
					</div>
				</div>

				<div className="page-header__row">
					{data?.fulfillment?.vendor?.name}
				</div>
			</header>

			<div className="foobar">
				<div className="foobar-main-content">
					<table>
						<thead>
							<tr>
								<th>Material No.</th>
								<th>Description</th>
								<th>Quantity</th>
							</tr>
						</thead>

						<tbody>
							{data.fulfillment?.lineItems.map((item) => (
								<tr key={item.id}>
									<td>
										{item.orderLineItem.sample.materialNo}
									</td>
									<td>
										<p className="title">
											{
												item.orderLineItem.sample
													.seriesName
											}{' '}
											{item.orderLineItem.sample.finish}{' '}
											{item.orderLineItem.sample.color}
										</p>
										<p className="caption">
											{
												item.orderLineItem.sample
													.seriesAlias
											}{' '}
											{item.orderLineItem.sample.finish}{' '}
											{
												item.orderLineItem.sample
													.colorAlias
											}
										</p>
									</td>
									<td>{item.orderLineItem.quantity}</td>
								</tr>
							))}
						</tbody>
					</table>

					<CommentForm />

					{data.comments ? (
						<div className="comments">
							{data.comments.map((comment) => (
								<Comment key={comment.id} comment={comment} />
							))}
						</div>
					) : null}
				</div>

				<div className="foobar-sidebar">
					<section className="sidebar-section">
						<h2 className="headline-h5">Ship To</h2>
						{data.fulfillment?.order?.address ? (
							<address className="text">
								{data.fulfillment.order.address.line1 &&
									`${data.fulfillment.order.address.line1}\n`}
								{data.fulfillment.order.address.line2 &&
									`${data.fulfillment.order.address.line2}\n`}
								{data.fulfillment.order.address.line3 &&
									`${data.fulfillment.order.address.line3}\n`}
								{data.fulfillment.order.address.line4 &&
									`${data.fulfillment.order.address.line4}\n`}
								{data.fulfillment.order.address.city},{' '}
								{data.fulfillment.order.address.state}{' '}
								{data.fulfillment.order.address.postalCode}
							</address>
						) : null}

						{isEditing ? (
							<Form method="post">
								<div className="input input--sm">
									<input
										ref={trackingNumberRef}
										type="text"
										name="trackingNumber"
										placeholder="Tracking number"
										defaultValue={
											data.fulfillment?.trackingInfo
												?.number
										}
									/>
								</div>

								<div className="input input--sm">
									<input
										type="text"
										name="shippingCarrier"
										placeholder="Shipping carrier"
										defaultValue={
											data.fulfillment?.trackingInfo
												?.company
										}
									/>
								</div>

								<div className="form-actions">
									<button
										className="primary button"
										type="submit"
										name="_action"
										value="save"
										disabled={isSaving}
									>
										{isSaving ? 'Saving...' : 'Save'}
									</button>

									<button
										className="button"
										type="button"
										onClick={() => setIsEditing(false)}
									>
										Cancel
									</button>
								</div>
							</Form>
						) : (
							<div>
								{data.fulfillment?.trackingInfo ? (
									<>
										<div>
											<div>
												{
													data.fulfillment
														?.trackingInfo?.number
												}
											</div>
											<div>
												{
													data.fulfillment
														?.trackingInfo?.company
												}
											</div>
										</div>
										<div>
											<button
												onClick={() =>
													setIsEditing(true)
												}
											>
												Edit
											</button>
											<button>Copy</button>
										</div>
									</>
								) : (
									<button
										className="link"
										onClick={() => setIsEditing(true)}
									>
										Add tracking info
									</button>
								)}
							</div>
						)}

						{/* {actionData?.success ? (
							<div className="success message">
								{actionData.success}
							</div>
						) : null} */}

						{actionData?.errors?.form ? (
							<div className="error message">
								{actionData.errors.form}
							</div>
						) : null}
					</section>
				</div>
			</div>

			{/* {data.fulfillment ? (
				<code>{JSON.stringify(data.fulfillment, null, 4)}</code>
			) : null} */}
		</>
	);
}

function Comment({ comment }) {
	let fetcher = useFetcher();
	let isDeleting = fetcher.state === 'submitting';

	// TODO: Style "isDeleting" state

	return (
		<fetcher.Form method="post" className="comment">
			<div>
				<input name="commentId" value={comment.id} type="hidden" />

				<div>
					<span className="comment__name">
						{comment.user.firstName} {comment.user.lastName}
					</span>
					<span className="comment__time">{comment.createdAt}</span>
				</div>

				<div className="comment__content">{comment.content}</div>
			</div>

			<button
				type="submit"
				name="_action"
				value="comment delete"
				className="sample-cart-delete-button"
				disabled={isDeleting}
			>
				<TrashIcon />
			</button>
		</fetcher.Form>
	);
}

function CommentForm() {
	const fetcher = useFetcher();
	const formRef = useRef(null);
	const isPosting = fetcher.state === 'submitting';

	useEffect(() => {
		if (!isPosting) {
			formRef.current?.reset();
		}
	});

	return (
		<fetcher.Form className="comment-form" method="post" ref={formRef}>
			<label htmlFor="comment">Comment</label>
			<textarea
				id="comment"
				name="comment"
				rows={6}
				placeholder="Leave a comment..."
			></textarea>

			<button type="submit" className="" name="_action" value="comment">
				{isPosting ? 'Posting...' : 'Post'}
			</button>
		</fetcher.Form>
	);
}
