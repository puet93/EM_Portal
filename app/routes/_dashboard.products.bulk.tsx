import type { ActionFunctionArgs } from '@remix-run/node';
import {
	json,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { badRequest } from '~/utils/request.server';
import { parseCSV, getDataFromFileUpload } from '~/utils/csv';

import FileDropInput from '~/components/FileDropInput';

export const action = async ({ params, request }: ActionFunctionArgs) => {
	await requireUserId(request);

	const handler = unstable_createMemoryUploadHandler();
	const formData = await unstable_parseMultipartFormData(request, handler);
	const _action = formData.get('_action');

	switch (_action) {
		case 'update': {
			const file = formData.get('file') as File;
			const data = await parseCSV(file);

			const updatedProducts = await prisma.$transaction(
				data.map(({ itemNo, sku, title }) => {
					return prisma.retailerProduct.update({
						where: {
							sku: sku,
						},
						data: {
							title: title,
							vendorProduct: itemNo
								? {
										connect: {
											itemNo,
										},
								  }
								: undefined,
						},
					});
				})
			);

			return json({ products: updatedProducts });
		}
		case 'sync': {
			console.log('ACTION: SYNC');
			return json({ action: 'sync' });
		}
		default:
			console.log('UNSUPPORTED ACTION');
			return json({ action: 'default' });
	}
};

export default function VendorProductsPage() {
	const actionData = useActionData<typeof action>();

	return (
		<>
			<Form method="post" encType="multipart/form-data">
				<FileDropInput name="file" />

				<button
					className="button"
					type="submit"
					name="_action"
					value="update"
				>
					Patch
				</button>
			</Form>

			{actionData?.products ? (
				<Form method="post" encType="multipart/form-data">
					<button
						className="primary button"
						type="submit"
						name="_action"
						value="sync"
					>
						Sync to Shopify
					</button>

					<ul>
						{actionData.products.map((product) => (
							<li key={product.sku}>
								{product.title}
								<input type="hidden" value={product.sku} />
							</li>
						))}
					</ul>
				</Form>
			) : null}
		</>
	);
}
