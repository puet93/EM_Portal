import type {
	ActionFunctionArgs,
	LoaderFunctionArgs,
	MetaFunction,
} from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useActionData, useSearchParams } from '@remix-run/react';
import { useEffect, useRef } from 'react';

import { verifyLogin } from '~/models/user.server';
import { createUserSession, getUserId } from '~/session.server';
import { safeRedirect, validateEmail } from '~/utils';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await getUserId(request);
	if (userId) return redirect('/orders');
	return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData();
	const email = formData.get('email');
	const password = formData.get('password');
	const redirectTo = safeRedirect(formData.get('redirectTo'), '/');
	const remember = formData.get('remember');

	if (!validateEmail(email)) {
		return json(
			{ errors: { email: 'Email is invalid', password: null } },
			{ status: 400 }
		);
	}

	if (typeof password !== 'string' || password.length === 0) {
		return json(
			{ errors: { email: null, password: 'Password is required' } },
			{ status: 400 }
		);
	}

	if (password.length < 8) {
		return json(
			{ errors: { email: null, password: 'Password is too short' } },
			{ status: 400 }
		);
	}

	const user = await verifyLogin(email, password);

	if (!user) {
		return json(
			{ errors: { email: 'Invalid email or password', password: null } },
			{ status: 400 }
		);
	}

	return createUserSession({
		redirectTo,
		remember: remember === 'on' ? true : false,
		request,
		userId: user.id,
	});
};

export const meta: MetaFunction = () => [{ title: 'Login' }];

export default function LoginPage() {
	const [searchParams] = useSearchParams();
	const redirectTo = searchParams.get('redirectTo') || '/';
	const actionData = useActionData<typeof action>();
	const emailRef = useRef<HTMLInputElement>(null);
	const passwordRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (actionData?.errors?.email) {
			emailRef.current?.focus();
		} else if (actionData?.errors?.password) {
			passwordRef.current?.focus();
		}
	}, [actionData]);

	return (
		<div className="login-page">
			<Form method="post" className="login-form">
				<h1 className="headline-h3">Log In</h1>
				<div className="input">
					<label
						autoFocus
						htmlFor="email"
						className="block text-sm font-medium text-gray-700"
					>
						Email address
					</label>
					<input
						ref={emailRef}
						id="email"
						required
						autoFocus={true}
						name="email"
						type="email"
						autoComplete="email"
						aria-invalid={
							actionData?.errors?.email ? true : undefined
						}
						aria-describedby="email-error"
						className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
					/>
					{actionData?.errors?.email ? (
						<div className="error message" id="email-error">
							{actionData.errors.email}
						</div>
					) : null}
				</div>

				<div className="input">
					<label
						htmlFor="password"
						className="block text-sm font-medium text-gray-700"
					>
						Password
					</label>
					<input
						id="password"
						ref={passwordRef}
						name="password"
						type="password"
						autoComplete="current-password"
						aria-invalid={
							actionData?.errors?.password ? true : undefined
						}
						aria-describedby="password-error"
						className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
					/>
					{actionData?.errors?.password ? (
						<div className="error message" id="password-error">
							{actionData.errors.password}
						</div>
					) : null}
				</div>

				<input type="hidden" name="redirectTo" value={redirectTo} />

				<button type="submit" className="primary button full-width">
					Log in
				</button>

				<div className="flex items-center justify-between">
					<div className="flex items-center">
						<input id="remember" name="remember" type="checkbox" />
						<label htmlFor="remember">Remember me</label>
					</div>
				</div>
			</Form>
		</div>
	);
}
