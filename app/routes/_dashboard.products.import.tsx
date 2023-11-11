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
		const updatedProducts = await prisma.$transaction(
			data.map((item) => {
				const { sku, ...values } = item;
				return prisma.retailerProduct.update({
					where: { sku: sku },
					data: {
						...values,
					},
				});
			})
		);
		return json({ updatedProducts });
	} catch (e) {
		return badRequest({ error: 'There was a problem updating products' });
	}
};

export default function ProductsImportPage() {
	const actionData = useActionData<typeof action>();
	return (
		<Form method="post" encType="multipart/form-data">
			<FileDropInput name="file" accept=".csv" />
			<button type="submit">Upload</button>

			{actionData?.error ? (
				<div className="error message">{actionData.error}</div>
			) : null}

			{actionData?.updatedProducts ? (
				<div className="success message">
					Form successfully submited.
				</div>
			) : null}
		</Form>
	);
}
