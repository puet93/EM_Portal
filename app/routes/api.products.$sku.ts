import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireSuperAdmin } from '~/session.server';
import { prisma } from '~/db.server';

export const loader: LoaderFunction = async ({ params, request }) => {
	await requireSuperAdmin(request);

	const retailerProduct = await prisma.retailerProduct.findMany({
		where: { sku: params.sku },
		include: {
			vendorProduct: true,
		},
	});

	return json({ retailerProduct });
};
