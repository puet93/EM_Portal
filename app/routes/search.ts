import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { prisma } from '~/db.server';

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData();
	const searchQuery = formData.get('query');

	if (typeof searchQuery !== 'string' || searchQuery.length === 0) {
		return json({ results: null });
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
					vendorProduct: {
						sampleMaterialNo: {
							search: query,
						},
					},
				},
				include: {
					vendorProduct: {
						include: {
							sample: true,
						},
					},
				},
			}),
			prisma.retailerProduct.findMany({
				where: {
					sku: {
						search: query,
					},
				},
				include: {
					vendorProduct: {
						include: {
							sample: true,
						},
					},
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
					vendorProduct: {
						include: {
							sample: true,
						},
					},
				},
			}),
			prisma.retailerProduct.findMany({
				where: {
					title: {
						search: query,
					},
				},
				include: {
					vendorProduct: {
						include: {
							sample: true,
						},
					},
				},
			}),
		]);

		const results = [];
		for (let i = 0; i < transactions.length; i++) {
			results.push(...transactions[i]);
		}

		if (results.length === 0) {
			return json({ results: null });
		}

		return json({
			queries: { originalQuery: searchQuery, formattedQuery, query },
			results,
		});
	} catch (e) {
		return json({ error: e, results: [] });
	}
};
