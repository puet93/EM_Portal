import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { userPrefs } from '../cookies.server';

export const action: ActionFunction = async ({ request }) => {
	const cookieHeader = request.headers.get('Cookie');
	const cookie = (await userPrefs.parse(cookieHeader)) || {};
	const formData = await request.formData();

	const isOpen = formData.get('sidebar') === 'open';
	cookie.sidebarIsOpen = isOpen;

	return json(isOpen, {
		headers: {
			'Set-Cookie': await userPrefs.serialize(cookie),
		},
	});
};
