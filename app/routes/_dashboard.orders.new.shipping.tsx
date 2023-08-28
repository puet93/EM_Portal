import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useActionData } from '@remix-run/react';
import { prisma } from '~/db.server';

export const action: ActionFunction = async ({ request }) => {
	const formData = await request.formData();

	const firstName = formData.get('firstName');
	const lastName = formData.get('lastName');

	const line1 = formData.get('addressLine1');
	const line2 = formData.get('addressLine2');
	const city = formData.get('city');
	const state = formData.get('state');
	const postalCode = formData.get('zipcode');

	if (
		typeof line1 !== 'string' ||
		typeof city !== 'string' ||
		typeof state !== 'string' ||
		typeof postalCode !== 'string'
	) {
		return json({ error: 'Bad request' });
	}

	const data = {
		line1,
		line2: typeof line2 === 'string' ? line2 : null,
		city,
		state,
		postalCode,
	};

	const address = await prisma.address.create({ data });

	return json({ address });
};

export default function ShippingAside() {
	const actionData = useActionData<typeof action>();

	return (
		<div className="shipping-info">
			<header className="shipping-info-header">
				<h2 className="headline-h6">Ship To</h2>
				<Link className="close-button" to="../">
					Cancel
				</Link>
			</header>

			{actionData?.address.id ? (
				<input type="text" value={actionData.address.id} />
			) : null}

			<Form method="post">
				<div className="input input--sm">
					<label htmlFor="ship-to-first-name">First Name</label>
					<input
						type="text"
						name="firstName"
						id="ship-to-first-name"
						defaultValue="Eddie"
					/>
				</div>

				<div className="input input--sm">
					<label htmlFor="ship-to-last-name">Last Name</label>
					<input
						type="text"
						name="lastName"
						id="ship-to-last-name"
						defaultValue="Bedrosian"
					/>
				</div>

				<div className="input input--sm">
					<label htmlFor="ship-to-address-line-1">
						Address Line 1
					</label>
					<input
						type="text"
						name="line1"
						id="ship-to-address-line-1"
						defaultValue="823 Emerald Bay"
					/>
				</div>

				<div className="input input--sm">
					<label htmlFor="ship-to-address-line-2">
						Address Line 2
					</label>
					<input
						type="text"
						name="line2"
						id="ship-to-address-line-2"
					/>
				</div>

				<div className="input input--sm">
					<label htmlFor="ship-to-city">City</label>
					<input
						type="text"
						name="city"
						id="ship-to-city"
						defaultValue="Emerald Bay"
					/>
				</div>

				<div className="input input--sm">
					<label htmlFor="ship-to-state">State</label>
					<input
						type="text"
						name="state"
						id="ship-to-state"
						defaultValue="California"
					/>
				</div>

				<div className="input input--sm">
					<label htmlFor="ship-to-zip">Zip Code</label>
					<input
						type="text"
						name="zipcode"
						id="ship-to-zip"
						defaultValue="92651"
					/>
				</div>

				{actionData?.address.id ? (
					<button
						type="submit"
						className="primary button full-width"
						name="_action"
						value="Update"
					>
						Update
					</button>
				) : (
					<button
						type="submit"
						className="primary button full-width"
						name="_action"
						value="Save"
					>
						Save
					</button>
				)}
			</Form>
		</div>
	);
}
