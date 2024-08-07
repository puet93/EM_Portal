import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { getDataFromFileUpload } from '~/utils/csv';
import { prisma } from '~/db.server';
import FileDropInput from '~/components/FileDropInput';
import { badRequest } from '~/utils/request.server';

export const action: ActionFunction = async ({ request }) => {
	const data = await getDataFromFileUpload(request, 'file');
	try {
		const products = await prisma.$transaction(
			data.map((item) => {
				if (item.itemNo) {
					return prisma.retailerProduct.create({
						data: {
							sku: item.sku,
							title: item.title,
							vendorProduct: {
								connect: {
									itemNo: item.itemNo,
								},
							},
						},
					});
				} else {
					return prisma.retailerProduct.create({
						data: {
							sku: item.sku,
							title: item.title,
						},
					});
				}
			})
		);
		return json({ products });
	} catch (e) {
		return badRequest({ error: 'There was a problem updating products' });
	}
};

export default function ProductsImportPage() {
	const actionData = useActionData<typeof action>();
	return (
		<div className="py-10">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<h1 className="text-4xl font-bold text-gray-900 dark:text-white">
					Products
				</h1>
				<p className="mt-2 text-sm font-normal leading-6 text-gray-500 dark:text-zinc-400">
					Create new products with CSV file.
				</p>
			</div>

			<div className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
				<Form
					method="post"
					encType="multipart/form-data"
					className="flex flex-col items-center gap-y-6"
				>
					<FileDropInput name="file" accept=".csv" />

					<button className="primary button" type="submit">
						Upload
					</button>

					{actionData?.error ? (
						<div className="error message">{actionData.error}</div>
					) : null}

					{actionData?.products ? (
						<div className="success message">
							Form successfully submited.
						</div>
					) : null}
				</Form>
			</div>
		</div>
	);
}
