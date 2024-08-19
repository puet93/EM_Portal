import type { MouseEvent, ReactNode } from 'react';
import { useState } from 'react';
import { Link } from '@remix-run/react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';

// Define the size classes
const sizes = {
	xs: 'rounded text-xs font-semibold px-2 py-1 ',
	sm: 'rounded text-sm font-semibold px-2 py-1  ',
	md: 'rounded-md text-sm font-semibold px-2.5 py-1.5',
	lg: 'rounded-md text-sm font-semibold px-3 py-2 ',
	xl: 'rounded-md text-sm font-semibold px-3.5 py-2.5 ',
};

// Define the color classes with dark mode support
const colors = {
	primary:
		'bg-sky-600 text-white shadow-sm hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-sky-500 dark:hover:bg-sky-400 dark:focus-visible:outline-sky-500',
	secondary:
		'bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:ring-0 dark:hover:bg-white/20',
	soft: 'bg-sky-50 text-sky-600 shadow-sm hover:bg-sky-100',
};

type ButtonType = 'button' | 'submit' | 'reset';

interface ButtonProps {
	as?: 'button' | 'link';
	color?: 'primary' | 'secondary' | 'soft';
	fullWidth?: boolean;
	name?: string;
	onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
	rel?: string;
	reloadDocument?: boolean;
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
	target?: '_blank';
	to?: string;
	type?: ButtonType;
	value?: string;
	children: ReactNode;
}

export function Button({
	as = 'button',
	color = 'secondary',
	fullWidth = false,
	onClick,
	name,
	rel,
	reloadDocument,
	size = 'lg',
	target,
	to = '',
	type = 'button',
	value,
	children,
}: ButtonProps) {
	let colorClasses = colors[color];
	let sizeClasses = sizes[size];
	let commonClasses = `font-medium ${sizeClasses} ${colorClasses}`;

	if (fullWidth) {
		commonClasses = commonClasses + ' w-full';
	}

	if (as === 'link') {
		return (
			<Link
				to={to}
				className={commonClasses + ' whitespace-nowrap'}
				rel={rel}
				target={target}
				reloadDocument={reloadDocument}
			>
				{children}
			</Link>
		);
	}

	return (
		<button
			name={name}
			value={value}
			type={type}
			className={commonClasses}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

interface CopyButtonProps {
	text: string;
	label?: string;
	successLabel?: string;
}

export function CopyButton({
	text,
	label = 'Copy to clipboard',
	successLabel = 'Copied!',
}: CopyButtonProps) {
	const [copySuccess, setCopySuccess] = useState('');

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopySuccess(successLabel);

			// Reset the state after 1 second
			setTimeout(() => {
				setCopySuccess('');
			}, 1000);
		} catch (err) {
			setCopySuccess('Failed to copy!');

			// Reset the state after 1 second
			setTimeout(() => {
				setCopySuccess('');
			}, 1000);
		}
	};

	return (
		<div className="flex flex-col items-center">
			<Popover className="relative">
				<PopoverButton
					as="button"
					onClick={copyToClipboard}
					className="rounded-full bg-transparent p-1.5 font-bold text-gray-400 transition-colors hover:bg-black/10 hover:text-gray-900 focus:outline-none dark:text-zinc-400 dark:hover:bg-black/50 dark:hover:text-white"
					aria-label={label}
				>
					<svg
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={1.5}
						stroke="currentColor"
						className="h-5 w-5"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
						/>
					</svg>
				</PopoverButton>
				{copySuccess && (
					<PopoverPanel
						static
						className="absolute bottom-10 left-1/2 z-10 mt-2 -translate-x-1/2 transform rounded-md bg-black px-3 py-2 text-center text-xs text-white"
					>
						<span className="whitespace-nowrap">{copySuccess}</span>
					</PopoverPanel>
				)}
			</Popover>
		</div>
	);
}
