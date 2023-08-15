import type { ActionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useActionData } from '@remix-run/react';
import { prisma } from '~/db.server';

export const action = async ({ request }: ActionArgs) => {
	const formData = await request.formData();
	const searchQuery = formData.get('query');

	if (typeof searchQuery !== 'string' || searchQuery.length === 0) {
		return json({ results: [] });
	}

	try {
		const formattedQuery = searchQuery
			.trim()
			.replace(/\s+/g, ' ')
			.replaceAll(' ,', ',');

		const query = formattedQuery
			.replaceAll(', ', ',')
			.replaceAll(',', '|')
			.replaceAll(' ', '&');

		const transactions = await prisma.$transaction([
			prisma.retailerProduct.findMany({
				where: {
					sku: {
						search: query,
					},
				},
				include: {
					vendorProduct: true,
				},
			}),
			prisma.retailerProduct.findMany({
				where: {
					vendorProduct: {
						itemNo: {
							search: query,
						},
					},
				},
				include: {
					vendorProduct: true,
				},
			}),
			prisma.retailerProduct.findMany({
				where: {
					title: {
						search: query,
					},
				},
				include: {
					vendorProduct: true,
				},
			}),
		]);

		const results = [];
		for (let i = 0; i < transactions.length; i++) {
			results.push(...transactions[i]);
		}

		return json({
			queries: { originalQuery: searchQuery, formattedQuery, query },
			results,
		});
	} catch (e) {
		return json({ error: e, results: [] });
	}
};
