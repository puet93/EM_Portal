import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link } from '@remix-run/react';
import { prisma } from '~/db.server';
import { EditIcon } from '~/components/Icons';

export default function ShippingAside() {
	return (
		<div className="shipping-info">
			<header className="shipping-info-header">
				<h2 className="headline-h6">Ship To</h2>
				<Link to="shipping" className="icon-button">
					<EditIcon />
				</Link>
			</header>

			<address>
				Eddie Bedrosian
				<br />
				823 Emerald Bay
				<br />
				Laguna Beach, CA 92651
			</address>
		</div>
	);
}
