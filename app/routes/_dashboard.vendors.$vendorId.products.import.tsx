import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import {
	Form,
	Link,
	Outlet,
	useActionData,
	useLoaderData,
} from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { parseCSV } from '~/utils/csv';
import { combineArrays, standardizeQueryString } from '~/utils/helpers';
import { badRequest } from '~/utils/request.server';

import FileDropInput from '~/components/FileDropInput';

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
	await requireUserId(request);
	return json({});
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
	await requireUserId(request);

	const vendor = await prisma.vendor.findUnique({
		where: { id: params.vendorId },
	});

	if (!vendor) {
		return badRequest({ formError: 'Unable to locate vendor.' });
	}

	const handler = unstable_createMemoryUploadHandler();
	const formData = await unstable_parseMultipartFormData(request, handler);
	const _action = formData.get('_action');

	switch (_action) {
		case 'upsert': {
			const file = formData.get('file') as File;
			const data: any[] = await parseCSV(file);

			const products = await prisma.$transaction(
				data.map((item) => {
					return prisma.vendorProduct.upsert({
						where: {
							itemNo: item.itemNo,
							vendor,
						},
						update: {
							seriesName: item.seriesName || undefined,
							color: item.color || undefined,
							finish: item.finish || undefined,
							listPrice: item.cost || undefined,
							retailerProduct: item.sku
								? {
										connectOrCreate: {
											where: {
												sku: item.sku,
											},
											create: {
												sku: item.sku,
												title: item.title,
											},
										},
								  }
								: undefined,
							sample: item.materialNo
								? {
										connectOrCreate: {
											where: {
												materialNo: item.materialNo,
											},
											create: {
												materialNo: item.materialNo,
												seriesName: item.seriesName,
												seriesAlias: item.seriesAlias,
												color: item.color,
												colorAlias: item.colorAlias,
												finish: item.finish,
											},
										},
								  }
								: undefined,
						},
						create: {
							vendor: {
								connect: {
									id: params.vendorId,
								},
							},
							itemNo: item.itemNo,
							seriesName: item.seriesName,
							color: item.color,
							finish: item.finish,
							listPrice: item.cost || undefined,
							retailerProduct: item.sku
								? {
										connectOrCreate: {
											where: {
												sku: item.sku,
											},
											create: {
												sku: item.sku,
												title: item.title,
											},
										},
								  }
								: undefined,
							sample: item.materialNo
								? {
										connectOrCreate: {
											where: {
												materialNo: item.materialNo,
											},
											create: {
												materialNo: item.materialNo,
												seriesName: item.seriesName,
												seriesAlias: item.seriesAlias,
												color: item.color,
												colorAlias: item.colorAlias,
												finish: item.finish,
											},
										},
								  }
								: undefined,
						},
					});
				})
			);

			console.log('CSV', data);
			console.log('PRODUCTS', products);

			if (products) {
				return json({ products });
			}

			return badRequest({ formError: 'Not yet implemented.' });
		}
		default:
			return badRequest({ formError: 'Unsupported action.' });
	}
};

export default function VendorProductsPage() {
	// const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	return (
		<div className="wrapper">
			<div>
				<h2>Import products</h2>
				<p>
					Update or create vendor products and their corresponding
					retailer products and associated samples by uploading a .CSV
					file. If a matching item number is found, the product will
					be updated. Unmatched item numbers will create new products.
				</p>
			</div>

			<Form method="post" encType="multipart/form-data">
				<FileDropInput id="file" name="file" />

				<button
					className="primary button"
					type="submit"
					name="_action"
					value="upsert"
				>
					Upload
				</button>

				<Link className="button" to="..">
					Cancel
				</Link>

				<Link
					className="button"
					to="https://docs.google.com/spreadsheets/d/1-xwDYiu0oQPyYUedZQUmGtUrEOPvjJJ41XifTfJfce4/edit?usp=sharing"
				>
					Download Example File
				</Link>
			</Form>

			{actionData && actionData.products ? (
				<div className="success message">Products uploaded!</div>
			) : null}
		</div>
	);
}
