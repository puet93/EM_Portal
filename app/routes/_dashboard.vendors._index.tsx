import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { requireUserId } from '~/session.server';
import { prisma } from '~/db.server';
import { BuildingIcon } from '~/components/Icons';

export const loader = async ({ params, request }: LoaderArgs) => {
	await requireUserId(request);
	const vendors = await prisma.vendor.findMany({
		orderBy: {
			name: 'asc',
		},
		include: {
			_count: {
				select: {
					users: true,
					products: true,
				},
			},
		},
	});

	console.log(vendors);

	return json({ vendors });
};

export default function VendorsPage() {
	const data = useLoaderData<typeof loader>();
	return (
		<>
			<header className="page-header align-baseline">
				<div className="page-header__row">
					<h1 className="headline-h3">Vendors</h1>

					<div className="page-header__actions">
						<Link className="primary button" to="new">
							Create New Vendor
						</Link>
					</div>
				</div>
			</header>

			<section className="page-section">
				<div className="vendor-cards">
					{data.vendors.map((vendor) => (
						<Link
							className="vendor-card"
							to={vendor.id}
							key={vendor.id}
						>
							<BuildingIcon />

							<div className="vendor-card-title">
								{vendor.name}
							</div>

							<address className="vendor-card-text">
								To be implemented
							</address>

							<div className="vendor-card__footer">
								<div className="vendor-card-detail">
									<svg
										width="18"
										height="18"
										viewBox="0 0 18 18"
										fill="none"
									>
										<path
											fill-rule="evenodd"
											clip-rule="evenodd"
											d="M15.75 6.06675V14.25C15.75 15.0788 15.0788 15.75 14.25 15.75H3.75C2.92125 15.75 2.25 15.0788 2.25 14.25V6.06675C2.25 5.86425 2.29125 5.66325 2.37075 5.47725L3.36075 3.1605C3.597 2.6085 4.13925 2.25 4.74 2.25H13.26C13.8608 2.25 14.403 2.6085 14.6393 3.1605L15.6293 5.47725C15.7088 5.664 15.75 5.86425 15.75 6.06675Z"
											stroke="#777E90"
											strokeWidth="1.125"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
										<path
											d="M2.25 6H15.7425"
											stroke="#777E90"
											strokeWidth="1.125"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
										<path
											d="M10.5 2.25L11.25 6V8.41875C11.25 8.73975 10.9612 9 10.605 9H7.395C7.03875 9 6.75 8.73975 6.75 8.41875V6L7.5 2.25"
											stroke="#777E90"
											strokeWidth="1.125"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
										<path
											d="M4.5 13.5H6"
											stroke="#777E90"
											strokeWidth="1.125"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>

									<span className="vendor-card-detail__counter">
										{vendor._count.products}{' '}
									</span>
									<span className="vendor-card-detail__label">
										{vendor._count.products !== 1
											? 'Products'
											: 'Product'}
									</span>
								</div>
								<div className="vendor-card-detail">
									{vendor._count.users !== 1 ? (
										<svg
											width="18"
											height="18"
											viewBox="0 0 18 18"
											fill="none"
										>
											<path
												d="M12 15V14.25C12 12.5931 10.6569 11.25 9 11.25H4.5C2.84315 11.25 1.5 12.5931 1.5 14.25V15"
												stroke="#777E90"
												strokeWidth="1.125"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
											<circle
												cx="6.75"
												cy="5.25"
												r="3"
												stroke="#777E90"
												strokeWidth="1.125"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
											<path
												d="M16.5 15V14.25C16.5 12.5931 15.1569 11.25 13.5 11.25V11.25"
												stroke="#777E90"
												strokeWidth="1.125"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
											<path
												d="M11.25 2.25C12.9069 2.25 14.25 3.59315 14.25 5.25C14.25 6.90685 12.9069 8.25 11.25 8.25"
												stroke="#777E90"
												strokeWidth="1.125"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									) : (
										<svg
											width="18"
											height="18"
											viewBox="0 0 18 18"
											fill="none"
										>
											<path
												d="M15 15V14.4375C15 12.6771 13.5729 11.25 11.8125 11.25H6.1875C4.42709 11.25 3 12.6771 3 14.4375V15"
												stroke="#777E90"
												strokeWidth="1.5"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
											<circle
												cx="9"
												cy="5.25"
												r="3"
												stroke="#777E90"
												strokeWidth="1.5"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									)}

									<span className="vendor-card-detail__counter">
										{vendor._count.users}{' '}
									</span>
									<span className="vendor-card-detail__label">
										{vendor._count.users !== 1
											? 'Users'
											: 'User'}
									</span>
								</div>
							</div>
						</Link>
					))}
				</div>
			</section>
		</>
	);
}
