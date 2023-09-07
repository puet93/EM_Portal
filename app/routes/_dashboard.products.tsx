import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { SyntheticEvent } from 'react';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import { Form, useActionData, useFetcher } from '@remix-run/react';
import { useState } from 'react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { parseCSV } from '~/utils/csv';
import { SearchIcon } from '~/components/Icons';
import FileDropInput from '~/components/FileDropInput';

export const action = async ({ request }: ActionArgs) => {
	await requireUserId(request);

	const handler = unstable_createMemoryUploadHandler();
	const formData = await unstable_parseMultipartFormData(request, handler);
	const _action = formData.get('_action');
	const file = formData.get('file') as File;
	const parsedCSV: any[] = await parseCSV(file);

	switch (_action) {
		case 'create': {
			const data: { sku: string; title: string; itemNo: string }[] =
				parsedCSV.map((row) => ({
					sku: row.sku,
					title: row.title || 'DEFAULT TITLE',
					itemNo: row.itemNo,
				}));
			const products = await prisma.$transaction(
				data.map(({ sku, title, itemNo }) => {
					return prisma.retailerProduct.create({
						data: {
							sku: sku,
							title: title,
							vendorProduct: {
								connect: {
									itemNo: itemNo,
								},
							},
						},
					});
				})
			);

			return json({ products });
		}
		case 'update': {
			const data: { sku: string; title: string }[] = parsedCSV.map(
				(row) => ({
					sku: row.sku,
					title: row.title,
				})
			);
			const products = await prisma.$transaction(
				data.map((product) => {
					return prisma.retailerProduct.update({
						where: {
							sku: product.sku,
						},
						data: {
							title: product.title,
						},
					});
				})
			);

			return json({
				success: true,
				message: 'Products updated.',
				products,
			});
		}
		default:
			return json({ message: 'Method not supported' }, 405);
	}
};

export const loader = async ({ request }: LoaderArgs) => {
	await requireUserId(request);
	return json({});
};

export default function RetailerProductPage() {
	const actionData = useActionData<typeof action>();
	const search = useFetcher();
	const [filename, setFilename] = useState('');

	function handleChange(event: SyntheticEvent): void {
		var regex = /[^\\]*\.(\w+)$/;
		const target = event.target as HTMLInputElement;
		const match = target.value.match(regex);
		const filename = match ? match[0] : '';
		setFilename(filename);
	}

	return (
		<main className="products-page">
			<div className="products-index-page">
				<header>
					<h1 className="headline-h3">Products</h1>
				</header>

				<Form replace method="post" encType="multipart/form-data">
					<input type="hidden" value={filename} />

					<div></div>
					<FileDropInput
						id="file"
						name="file"
						handleChange={handleChange}
						accept=".csv"
					/>

					{actionData?.formError ? (
						<div className="error message">
							{actionData.formError}
						</div>
					) : null}

					{actionData?.success && actionData.message ? (
						<div className="success message">
							{actionData.message}
						</div>
					) : null}

					<button
						className="button"
						type="submit"
						name="_action"
						value="update"
					>
						Update
					</button>
				</Form>

				{actionData?.products ? (
					<table>
						<tbody>
							<tr>
								<th>Title</th>
							</tr>

							{actionData.products.map((product) => (
								<tr key={product.id}>
									<td>{product.title}</td>
								</tr>
							))}
						</tbody>
					</table>
				) : null}

				<div className="table-toolbar">
					<search.Form method="post" action="/search">
						<div className="search-bar">
							<SearchIcon className="search-icon" id="search" />
							<input
								type="search"
								className="search-input"
								name="query"
								placeholder="Search by name, item number, or sku"
							/>
							<button type="submit" className="primary button">
								Search
							</button>
						</div>
					</search.Form>
				</div>

				{search.data?.results ? (
					<table>
						<tbody>
							<tr>
								<th className="caption">Description</th>
								<th className="caption">Vendor Item No.</th>
							</tr>
							{search.data.results.map((product) => (
								<tr key={product.id}>
									<td>
										<div className="title">
											{product.title}
										</div>
										<div className="caption">
											{product.sku}
										</div>
									</td>
									<td>{product.vendorProduct.itemNo}</td>
								</tr>
							))}
						</tbody>
					</table>
				) : null}
			</div>
		</main>
	);
}
