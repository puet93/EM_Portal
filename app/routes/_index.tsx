import type { V2_MetaFunction } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { useOptionalUser } from '~/utils';

export const meta: V2_MetaFunction = () => [
	{ title: 'Edward Martin Label Printer' },
];

export default function Index() {
	const user = useOptionalUser();

	return (
		<div>
			<h1>Edward Martin Label Printer</h1>
			{user ? (
				<div>
					<Link to="/orders">Orders</Link>
				</div>
			) : (
				<div>
					<Link to="/login">Log In</Link>
				</div>
			)}
		</div>
	);
}
