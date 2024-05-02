import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';

export const meta: MetaFunction = () => [
	{ title: 'Edward Martin Label Printer' },
];

export const loader: LoaderFunction = async () => {
	return redirect('/login');
};
