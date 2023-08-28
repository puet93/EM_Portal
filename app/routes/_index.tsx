import type { LoaderFunction, V2_MetaFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';

export const meta: V2_MetaFunction = () => [
	{ title: 'Edward Martin Label Printer' },
];

export const loader: LoaderFunction = async () => {
	return redirect('/login');
};
