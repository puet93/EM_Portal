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
import { badRequest } from '~/utils/request.server';
import { graphqlClient } from '~/utils/shopify.server';
import FileDropInput from '~/components/FileDropInput';
import Dropdown from '~/components/Dropdown';
import Input from '~/components/Input';
import { parseCSV } from '~/utils/csv';

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
	const { _action, ...entries } = Object.fromEntries(formData);

	const sampleId = String(entries.sampleId);
	const vendorId = String(entries.vendorId);

	await prisma.sample.update({
		where: { id: sampleId },
		data: { vendorId: vendorId },
	});

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

		// if no checboxes are checked, set master checkbox checked to false
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
		<div>
			<h1 className="headline-h3">Samples List</h1>

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

			{actionData && actionData.empty?.length === 0 ? (
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
			) : null}

			{/* Search Form */}
			<div className="table-toolbar">
				<Form
					className="inline-form"
					method="get"
					replace
					style={{
						display: 'flex',
						alignItems: 'flex-end',
						justifyContent: 'space-between',
					}}
				>
					<Input
						label="Series"
						id="series"
						name="series"
						defaultValue={data.fields.series}
					/>

					<Input
						label="Color"
						id="color"
						name="color"
						defaultValue={data.fields.color}
					/>

					<Input
						label="Finish"
						id="finish"
						name="finish"
						defaultValue={data.fields.finish}
					/>

					<Dropdown
						name="vendorId"
						options={data.vendorFilterOptions}
						defaultValue={data.fields.vendorId}
					/>

					<button className="primary button" type="submit">
						Search
					</button>

					<Link className="button" to="new">
						Create New Sample
					</Link>
				</Form>
			</div>

			<div>Displaying {data.samples.length} samples</div>

			{data.samples ? (
				<table>
					<tbody ref={tableBodyRef}>
						<tr>
							<th>
								<input
									ref={masterCheckboxRef}
									id="master-checkbox"
									type="checkbox"
									onChange={handleMasterCheckboxChange}
								/>
							</th>
							<th>Vendor</th>
							<th>Material No.</th>
							<th>Series</th>
							<th>Linked Items</th>
							<th style={{ textAlign: 'center' }}>Shopify</th>
						</tr>
						{data.samples.map((sample) => (
							<tr className="row" key={sample.id}>
								<td>
									<input
										type="checkbox"
										name="sampleId"
										value={sample.id}
										onChange={handleChange}
									/>
								</td>
								<td>
									{sample.vendor?.name ? (
										sample.vendor?.name
									) : (
										<SampleVendorItem
											sampleId={sample.id}
											vendorOptions={data.vendorOptions}
										/>
									)}
								</td>
								<td>
									<Link to={sample.id}>
										{sample.materialNo}
									</Link>
								</td>
								<td>
									<Link to={sample.id}>
										{sample.seriesName} - {sample.color}{' '}
										{sample.finish}
									</Link>
								</td>
								<td>
									<Link to={sample.id}>
										{sample.vendorProducts.map(
											(vendorProduct) => (
												<div
													key={
														vendorProduct
															.retailerProduct.id
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
								<td style={{ textAlign: 'center' }}>
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
			) : null}
		</div>
	);
}
