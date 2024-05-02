import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { prisma } from '~/db.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const { searchParams } = new URL(request.url);
	const searchQuery = searchParams.get('query');
	let results;
	let errors: string[] = [];

	if (typeof searchQuery == 'string' && searchQuery.length !== 0) {
		try {
			const formattedQuery = searchQuery
				.trim()
				.replace(/\s+/g, ' ')
				.replaceAll(' ,', ',');

			const query = formattedQuery
				.replaceAll(', ', ',')
				.replaceAll(',', '|')
				.replaceAll(' ', '&');

			const samples = await prisma.sample.findMany({
				where: {
					materialNo: {
						search: query,
					},
				},
				orderBy: {
					vendor: {
						name: 'asc',
					},
				},
				include: {
					vendor: {
						select: {
							name: true,
						},
					},
				},
			});

			if (samples.length > 0) {
				results = samples;
			} else {
				errors.push('No results');
			}
		} catch (e) {
			errors.push('Unable to search for some reason');
		}
	}

	if (errors.length > 0) return json({ errors });
	return json({ results });
};
