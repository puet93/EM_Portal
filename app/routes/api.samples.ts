import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	json,
} from '@remix-run/node';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { parseCSV } from '~/utils/csv';
import { splitMeasurement } from '~/utils/measure';
import { badRequest } from '~/utils/request.server';

export const action = async ({ params, request }: ActionFunctionArgs) => {
	await requireUserId(request);

	switch (request.method) {
		case 'POST': {
			const handler = unstable_createMemoryUploadHandler();
			const formData = await unstable_parseMultipartFormData(
				request,
				handler
			);
			const file = formData.get('file') as File;
			const parsedCSV: any[] = await parseCSV(file);
			const data = parsedCSV.map(
				({ materialNo, seriesName, color, ...fields }) => {
					const obj = { materialNo, seriesName, color };
					for (const [key, value] of Object.entries(fields)) {
						if (key === 'finish' && value) {
							obj[key] = value;
						}
					}
					return obj;
				}
			);

			const samples = await prisma.$transaction(
				data.map((item) => prisma.sample.create({ data: item }))
			);

			return json({ samples });
		}
		default:
			break;
	}
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
	await requireUserId(request);
	const samples = await prisma.sample.findMany();
	return json({ samples });
};
