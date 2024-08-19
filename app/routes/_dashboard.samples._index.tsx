import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import type { RefObject, SyntheticEvent } from 'react';
import { useEffect, useRef } from 'react';
import {
	json,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from '@remix-run/node';
import {
	Form,
	Link,
	useActionData,
	useFetcher,
	useLoaderData,
} from '@remix-run/react';
import { prisma } from '~/db.server';
import { requireUserId } from '~/session.server';
import { graphqlClient, publishProduct } from '~/utils/shopify.server';
import Dropdown from '~/components/Dropdown';
import { Input } from '~/components/Input';

const FILE = 'file';

export const loader: LoaderFunction = async ({ request }) => {
	const searchParams = new URL(request.url).searchParams;
	const seriesName = searchParams.get('series');
	const finish = searchParams.get('finish');
	const color = searchParams.get('color');
	const vendorId = searchParams.get('vendorId');

	const vendors = await prisma.vendor.findMany({});
	const vendorFilterOptions = [
		{ value: '', label: '' },
		{ value: 'no vendor', label: 'No vendor' },
	];
	const vendorOptions = [];
	if (vendors && vendors.length > 0) {
		for (let i = 0; i < vendors.length; i++) {
			vendorFilterOptions.push({
				value: vendors[i].id,
				label: vendors[i].name,
			});
			vendorOptions.push({
				value: vendors[i].id,
				label: vendors[i].name,
			});
		}
	}

	const fields: {
		series?: string;
		finish?: string;
		color?: string;
		vendorId?: string;
	} = {};

	const query: {
		OR?: {};
		finish?: { contains: string; mode: string };
		color?: { contains: string; mode: string };
		AND?: {};
	} = {};

	if (seriesName) {
		fields['series'] = seriesName;

		query['OR'] = [
			{
				seriesName: {
					contains: seriesName,
					mode: 'insensitive',
				},
			},
			{
				seriesAlias: {
					contains: seriesName,
					mode: 'insensitive',
				},
			},
		];
	}

	if (finish) {
		fields['finish'] = finish;
		query['finish'] = {
			contains: finish,
			mode: 'insensitive',
		};
	}

	if (color) {
		fields['color'] = color;
		query['color'] = {
			contains: color,
			mode: 'insensitive',
		};
	}

	if (vendorId) {
		fields['vendorId'] = vendorId;

		query['AND'] = {
			vendorId: vendorId === 'no vendor' ? null : vendorId,
		};
	}

	const samples = await prisma.sample.findMany({
		where: query,
		include: {
			vendor: true,
			vendorProducts: {
				include: { retailerProduct: true },
			},
		},
		orderBy: [{ seriesName: 'asc' }, { materialNo: 'asc' }],
	});

	return json({
		samples,
		fields,
		vendorFilterOptions,
		vendorOptions,
	});
};

export const action: ActionFunction = async ({ request }) => {
	await requireUserId(request);

	const formData = await request.formData();
	const _action = formData.get('_action');
	const sampleIds = formData.getAll('sampleId');

	if (_action === 'publish') {
		const gids = await prisma.sample.findMany({
			where: { id: { in: sampleIds } },
			select: {
				gid: true,
			},
		});

		gids.map((sample) => {
			if (sample.gid) {
				publishProduct(sample.gid);
			}
		});
	}

	if (_action === 'vendor') {
		const sampleId = String(formData.get('sampleId'));
		const vendorId = String(formData.get('vendorId'));

		await prisma.sample.update({
			where: { id: sampleId },
			data: { vendorId: vendorId },
		});
	}

	return json({});

	// TODO: Move bulk uploader to another route
	// const handler = unstable_createMemoryUploadHandler();
	// const formData = await unstable_parseMultipartFormData(request, handler);
	// const _action = formData.get('_action');

	// switch (_action) {
	// 	case 'upsert': {
	// 		const file = formData.get(FILE) as File;
	// 		const data = await parseCSV(file);

	// 		// const exists = await prisma.$transaction(
	// 		// 	data.map((sample) => {
	// 		// 		return prisma.sample.findUnique({
	// 		// 			where: { materialNo: sample.materialNo },
	// 		// 		});
	// 		// 	})
	// 		// );

	// 		// console.log('EXISTS?', exists); // returns null if it doesn't exist

	// 		const upsertedSamples = await prisma.$transaction(
	// 			data.map((sample) => {
	// 				return prisma.sample.upsert({
	// 					where: { materialNo: sample.materialNo },
	// 					update: {
	// 						seriesName: sample.seriesName, // Vendor's series name
	// 						color: sample.color,
	// 						finish: sample.finish || undefined,
	// 						seriesAlias: sample.seriesAlias || undefined,
	// 						colorAlias: sample.colorAlias || undefined,
	// 					},
	// 					create: {
	// 						materialNo: sample.materialNo,
	// 						seriesName: sample.seriesName,
	// 						color: sample.color,
	// 						finish: sample.finish || undefined,
	// 						seriesAlias: sample.seriesAlias || undefined,
	// 						colorAlias: sample.colorAlias || undefined,
	// 					},
	// 				});
	// 			})
	// 		);

	// 		return json({ upsertedSamples });
	// 	}
	// 	case 'update': {
	// 		const file = formData.get(FILE) as File;
	// 		const data = await parseCSV(file);

	// 		const updatedSamples = await prisma.$transaction(
	// 			data.map((sample) => {
	// 				return prisma.sample.update({
	// 					where: { materialNo: sample.materialNo },
	// 					data: { finish: sample.finish },
	// 				});
	// 			})
	// 		);

	// 		console.log('UPDATED:', updatedSamples);

	// 		return json({ data: updatedSamples });
	// 	}
	// 	case 'metafields': {
	// 		const metafieldQuery = formData.get('metafieldQuery');

	// 		const response = await graphqlClient.query({
	// 			data: `{
	// 				products(first: 250, query: "title:${metafieldQuery}* AND status:ACTIVE AND tag_not:sample") {
	// 					edges {
	// 						node {
	// 						id
	// 						title
	// 							metafield(namespace: "pdp", key: "sample") {
	// 								id
	// 								value
	// 							}
	// 						}
	// 					}
	// 				}
	// 			}`,
	// 		});

	// 		const productCount = response.body.data.products.edges.length;
	// 		const products = response.body.data.products.edges.map(
	// 			(product) => product.node
	// 		);

	// 		const needToConnect = products.filter(
	// 			(product) => product.metafield === null
	// 		);

	// 		return json({ empty: needToConnect, productCount });
	// 	}
	// 	default:
	// 		return badRequest({ message: 'Invalid action' });
	// }
};

function SampleVendorItem({
	sampleId,
	vendorOptions,
}: {
	sampleId: string;
	vendorOptions: { value: string; label: string }[];
}) {
	let fetcher = useFetcher();
	let isSaving = fetcher.submission?.formData?.get('sampleId') === sampleId;

	return (
		<fetcher.Form method="post">
			<input type="hidden" name="sampleId" value={sampleId} />

			<select name="vendorId">
				{vendorOptions.map(({ value, label }) => (
					<option key={value} value={value}>
						{label}
					</option>
				))}
			</select>

			<button type="submit" name="_action" value="vendor">
				{isSaving ? 'Saving...' : 'Save'}
			</button>
		</fetcher.Form>
	);
}

export default function SamplesPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	const masterCheckboxRef = useRef(null) as RefObject<HTMLInputElement>;
	const tableBodyRef = useRef(null) as RefObject<HTMLTableSectionElement>;

	useEffect(() => {
		if (!masterCheckboxRef.current) return;
		masterCheckboxRef.current.indeterminate = false;
		masterCheckboxRef.current.checked = false;

		const checkboxes = getCheckboxes();
		if (!checkboxes) return;
		for (let i = 0; i < checkboxes.length; i++) {
			checkboxes[i].checked = false;
		}
	}, [data]);

	function getCheckboxes() {
		if (!tableBodyRef.current) return;
		const checkboxes: NodeListOf<HTMLInputElement> =
			tableBodyRef.current.querySelectorAll('input[type="checkbox"]');
		return checkboxes;
	}

	function handleChange() {
		const checkboxes = getCheckboxes();
		if (!checkboxes || !masterCheckboxRef.current) return;

		const count = checkboxes.length;
		let checkedCount = 0;
		for (let i = 0; i < count; i++) {
			if (checkboxes[i].checked) {
				++checkedCount;
			}
		}

		// if no checkboxes are checked, set master checkbox checked to false
		if (checkedCount === 0) {
			masterCheckboxRef.current.indeterminate = false;
			masterCheckboxRef.current.checked = false;
			return;
		}

		// if all checkboxes are checked, set master checkbox checked to true
		if (checkedCount / count === 1) {
			masterCheckboxRef.current.indeterminate = false;
			masterCheckboxRef.current.checked = true;
			return;
		}

		// if some checkboxes are checked, set master checkbox indeterminate to true
		if (checkedCount / count !== 1) {
			masterCheckboxRef.current.indeterminate = true;
			return;
		}
	}

	function handleMasterCheckboxChange(e: SyntheticEvent<HTMLInputElement>) {
		const checkboxes = getCheckboxes();
		if (!checkboxes) return;
		for (let i = 0; i < checkboxes.length; i++) {
			if (e.currentTarget.checked) {
				checkboxes[i].checked = true;
			} else {
				checkboxes[i].checked = false;
			}
		}
	}

	return (
		<>
			<div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
				<div className="md:flex md:items-center md:justify-between">
					<div className="min-w-0 flex-1">
						<h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
							Samples
						</h2>
					</div>
					<div className="mt-4 flex gap-x-4 md:ml-4 md:mt-0">
						<Form method="post" id="publish">
							<button
								className="button"
								type="submit"
								name="_action"
								value="publish"
							>
								Publish
							</button>
						</Form>

						<Link
							className="button transition-colors hover:bg-blue-500 dark:bg-blue-600"
							to="new"
						>
							Create New Sample
						</Link>
					</div>
				</div>
			</div>

			{/* Bulk Upload Form */}
			{/* TODO: Move to own component */}
			{/* <Form method="post" encType="multipart/form-data">
				<FileDropInput id="file" name={FILE} accept=".csv" />
				<button
					className="button"
					type="submit"
					name="_action"
					value="upsert"
				>
					Upload
				</button>
			</Form> */}

			{/* <div className="table-toolbar">
				<Form method="post" className="inline-form">
					<Input
						label="Series"
						id="metafield-query"
						name="metafieldQuery"
						defaultValue={data.fields.series}
					/>

					<button
						className="button"
						type="submit"
						name="_action"
						value="metafields"
					>
						Check Series
					</button>
				</Form>
			</div> */}

			{/* {actionData && actionData.empty?.length === 0 ? (
				<div className="success message">
					Contgrats! {actionData.empty.length} out of{' '}
					{actionData.productCount} products without samples.
				</div>
			) : null}

			{actionData && actionData.empty?.length >= 1 ? (
				<div className="warning message">
					{actionData.empty.length} out of {actionData.productCount}{' '}
					products with samples.
				</div>
			) : null}

			{actionData && actionData.upsertedSamples ? (
				<div className="success message">UPDATED!</div>
			) : null} */}

			{/* Search Form */}
			<div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
				<Form className="flex items-end gap-x-6" method="get" replace>
					<div className="grow">
						<Input
							label="Series"
							id="series"
							name="series"
							defaultValue={data.fields.series}
						/>
					</div>

					<div className="grow">
						<Input
							label="Color"
							id="color"
							name="color"
							defaultValue={data.fields.color}
						/>
					</div>

					<div className="grow">
						<Input
							label="Finish"
							id="finish"
							name="finish"
							defaultValue={data.fields.finish}
						/>
					</div>

					<div className="mb-5 grow">
						<Dropdown
							name="vendorId"
							options={data.vendorFilterOptions}
							defaultValue={data.fields.vendorId}
						/>
					</div>

					<button
						className="button mb-5 transition-colors hover:bg-blue-500 dark:bg-blue-600 "
						type="submit"
					>
						Search
					</button>
				</Form>
			</div>

			{data.samples ? (
				<div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
					<div>Displaying {data.samples.length} samples</div>

					<table className="min-w-full divide-y divide-gray-300 dark:divide-zinc-700">
						<thead>
							<tr>
								<th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-0">
									<input
										ref={masterCheckboxRef}
										id="master-checkbox"
										type="checkbox"
										onChange={handleMasterCheckboxChange}
									/>
								</th>

								<th className="px-3 py-3.5 text-left text-sm font-semibold text-white">
									Vendor
								</th>

								<th className="px-3 py-3.5 text-left text-sm font-semibold text-white">
									Material No.
								</th>

								<th className="px-3 py-3.5 text-left text-sm font-semibold text-white">
									Series
								</th>

								<th className="px-3 py-3.5 text-left text-sm font-semibold text-white">
									Linked Items
								</th>

								<th className="py-3.5 pl-3 pr-4 text-left text-sm font-semibold text-white sm:pr-0">
									Shopify
								</th>
							</tr>
						</thead>
						<tbody
							ref={tableBodyRef}
							className="divide-y divide-gray-200 dark:divide-zinc-800"
						>
							{data.samples.map((sample) => (
								<tr key={sample.id}>
									<td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium dark:text-white sm:pl-0">
										<input
											type="checkbox"
											name="sampleId"
											value={sample.id}
											onChange={handleChange}
											form="publish"
										/>
									</td>

									<td className="whitespace-nowrap px-3 py-4 text-sm dark:text-zinc-300">
										{sample.vendor?.name ? (
											<div>
												{sample.title ? (
													<div>{sample.title}</div>
												) : null}
												<div>{sample.vendor?.name}</div>
											</div>
										) : (
											<SampleVendorItem
												sampleId={sample.id}
												vendorOptions={
													data.vendorOptions
												}
											/>
										)}
									</td>

									<td className="whitespace-nowrap px-3 py-4 text-sm dark:text-zinc-300">
										<Link to={sample.id}>
											{sample.materialNo}
										</Link>
									</td>

									<td className="whitespace-nowrap px-3 py-4 text-sm dark:text-zinc-300">
										<Link to={sample.id}>
											{sample.seriesName} - {sample.color}{' '}
											{sample.finish}
										</Link>
									</td>

									<td className="whitespace-nowrap px-3 py-4 text-sm dark:text-zinc-300">
										<Link to={sample.id}>
											{sample.vendorProducts.map(
												(vendorProduct) => (
													<div
														key={
															vendorProduct
																.retailerProduct
																.id
														}
													>
														{
															vendorProduct
																.retailerProduct
																.title
														}
													</div>
												)
											)}
										</Link>
									</td>

									<td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm dark:text-zinc-300">
										{sample.gid ? (
											<span className="success indicator"></span>
										) : (
											<Link to={`${sample.id}/edit`}>
												Edit
											</Link>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : null}
		</>
	);
}
