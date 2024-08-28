import { json } from '@remix-run/node';
import {
	Form,
	Link,
	useActionData,
	useFetcher,
	useLoaderData,
} from '@remix-run/react';
import { PhotoIcon } from '@heroicons/react/24/solid';
import { useEffect, useRef, useState } from 'react';

import { prisma } from '~/db.server';
import { requireUserId } from '~/session.server';
import { publishProduct } from '~/utils/shopify.server';
import { Button } from '~/components/Buttons';
import { Input, Label, Select } from '~/components/Input';

import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import type { Option } from '~/components/Input';

export const loader: LoaderFunction = async ({ request }) => {
	const searchParams = new URL(request.url).searchParams;
	const seriesName = searchParams.get('series');
	const finish = searchParams.get('finish');
	const color = searchParams.get('color');
	const vendorId = searchParams.get('vendorId');

	const vendors = await prisma.vendor.findMany({});
	const vendorFilterOptions = [
		{ value: '', label: 'All vendors' },
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

	if (_action === 'delete_all') {
		console.log('DELETE ALL');
		const samplesToDelete = formData.getAll('samplesToDelete') || [];

		if (samplesToDelete.length === 0) {
			return json({ error: { deleteAll: 'Nothing to delete' } });
		}
		try {
			await prisma.sample.deleteMany({
				where: { id: { in: samplesToDelete } },
			});
		} catch (e) {
			return json({
				error: { deleteAll: e.message || 'Unable to delete samples' },
			});
		}
		return json({ success: { deleteAll: 'Deleted' } });
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
};

function SampleVendorItem({
	sampleId,
	vendorOptions,
}: {
	sampleId: string;
	vendorOptions: Option[];
}) {
	let fetcher = useFetcher();
	let isSaving = fetcher.submission?.formData?.get('sampleId') === sampleId;

	return (
		<fetcher.Form method="post" className="flex items-end gap-x-2">
			<input type="hidden" name="sampleId" value={sampleId} />

			<Select id="vendorId" name="vendorId" options={vendorOptions} />

			<Button type="submit" name="_action" value="vendor">
				{isSaving ? 'Saving...' : 'Save'}
			</Button>
		</fetcher.Form>
	);
}

export default function SamplesPage() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const checkbox = useRef();
	const [checked, setChecked] = useState(false);
	const [indeterminate, setIndeterminate] = useState(false);
	const [selectedSamples, setSelectedSamples] = useState([]);

	useEffect(() => {
		console.log('SELECTED SAMPLES');
	}, [selectedSamples]);

	return (
		<>
			<div className="mx-auto max-w-7xl">
				<div className="md:flex md:items-center md:justify-between">
					<div className="min-w-0 flex-1">
						<h2 className="text-4xl font-bold leading-7 text-gray-900 dark:text-white">
							Samples
						</h2>
					</div>
					<div className="mt-4 flex gap-x-4 md:ml-4 md:mt-0">
						<Form method="post" id="publish">
							<Button
								size="lg"
								type="submit"
								name="_action"
								value="publish"
							>
								Publish
							</Button>
						</Form>

						<Button as="link" color="primary" size="lg" to="new">
							Create New Sample
						</Button>
					</div>
				</div>
			</div>

			{/* Search Form */}
			<div className="mx-auto max-w-7xl py-10">
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

					<div className="grow">
						<Label htmlFor="vendorId">Vendors</Label>

						<div className="mt-2">
							<Select
								id="vendorId"
								name="vendorId"
								options={data.vendorFilterOptions}
							/>
						</div>
					</div>

					<Button color="primary" type="submit">
						Search
					</Button>
				</Form>
			</div>

			{data.samples ? (
				<>
					<div className="mx-auto max-w-7xl py-10">
						<div>Displaying {data.samples.length} samples</div>
						{actionData?.success?.deleteAll ? (
							<div className="rounded-md bg-zinc-950 px-3 py-2 font-mono text-sm leading-6 text-green-500">
								{actionData.success.deleteAll}
							</div>
						) : null}

						{actionData?.error?.deleteAll ? (
							<div className="rounded-md bg-zinc-950 px-3 py-2 font-mono text-sm leading-6 text-red-500">
								{actionData.error.deleteAll}
							</div>
						) : null}

						<div className="relative">
							<div className="absolute left-14 top-0 flex h-12 items-center space-x-3 bg-white sm:left-12">
								{/* <button
									type="button"
									className="inline-flex items-center rounded bg-white px-2 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white"
								>
									Bulk edit
								</button> */}
								{/* <Button
									color="soft"
									form="selectAllForm"
									type="submit"
									name="_action"
									value="delete_all"
								>
									Delete all
								</Button> */}
							</div>

							<table className="w-full divide-y divide-gray-300 dark:divide-zinc-700">
								<thead>
									<tr>
										<th className="relative px-7 sm:w-12 sm:px-6">
											<input
												type="checkbox"
												className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-600"
											/>
										</th>
										<th className="px-3 py-3.5 text-left text-sm font-semibold text-white">
											Material No.
										</th>

										<th className="px-3 py-3.5 text-left text-sm font-semibold text-white">
											Description
										</th>

										<th className="px-3 py-3.5 text-left text-sm font-semibold text-white">
											Vendor
										</th>

										<th className="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-white sm:pr-0">
											Shopify
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
									{data.samples.map((sample) => (
										<tr key={sample.id}>
											<td className="relative px-7 sm:w-12 sm:px-6">
												<input
													type="checkbox"
													className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-600"
													value={sample.id}
													name="samplesToDelete"
													form="selectAllForm"
													defaultChecked={false}
												/>
											</td>

											<td className="whitespace-nowrap px-3 py-4 text-sm">
												{sample.vendor?.name ? (
													<Link to={sample.id}>
														<div className="text-sm font-medium leading-6 text-gray-900 dark:text-white">
															{sample.materialNo}
														</div>
													</Link>
												) : (
													<SampleVendorItem
														sampleId={sample.id}
														vendorOptions={
															data.vendorOptions
														}
													/>
												)}
											</td>

											<td className="px-3 py-4 text-sm font-medium text-gray-900 dark:text-white">
												<Link to={sample.id}>
													{sample.title ? (
														sample.title
													) : (
														<span>
															{sample.seriesAlias}{' '}
															- {sample.finish}{' '}
															{sample.colorAlias}
														</span>
													)}
													<div className="gray-500 text-xs font-light leading-6 dark:text-zinc-400">
														Edward Martin
													</div>
												</Link>
											</td>

											<td className="px-3 py-4 text-sm font-medium text-gray-900 dark:text-white">
												<Link to={sample.id}>
													{sample.vendorTitle || (
														<span>
															{sample.seriesName}{' '}
															- {sample.color}{' '}
															{sample.finish}
														</span>
													)}

													<div className="gray-500 text-xs font-light leading-6 dark:text-zinc-400">
														{sample.vendor?.name}
													</div>
												</Link>
											</td>

											<td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm dark:text-zinc-300">
												{sample.gid ? (
													<span className="success indicator"></span>
												) : (
													<Link
														to={`${sample.id}/edit`}
													>
														Edit
													</Link>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<Form method="post" id="selectAllForm"></Form>
				</>
			) : null}
		</>
	);
}

export function FileDrop() {
	return (
		<div className="col-span-full">
			<label
				htmlFor="cover-photo"
				className="block text-sm font-medium leading-6 text-gray-900"
			>
				Cover photo
			</label>
			<div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
				<div className="text-center">
					<PhotoIcon
						aria-hidden="true"
						className="mx-auto h-12 w-12 text-gray-300"
					/>
					<div className="mt-4 flex text-sm leading-6 text-gray-600">
						<label
							htmlFor="file-upload"
							className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
						>
							<span>Upload a file</span>
							<input
								id="file-upload"
								name="file-upload"
								type="file"
								className="sr-only"
							/>
						</label>
						<p className="pl-1">or drag and drop</p>
					</div>
					<p className="text-xs leading-5 text-gray-600">
						PNG, JPG, GIF up to 10MB
					</p>
				</div>
			</div>
		</div>
	);
}
