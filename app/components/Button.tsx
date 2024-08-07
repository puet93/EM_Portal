import type { MouseEvent, ReactNode } from 'react';
import { Link } from '@remix-run/react';

// Define the size classes
const sizes = {
	sm: 'rounded text-xs font-semibold px-2 py-1 ',
	xs: 'rounded text-sm font-semibold px-2 py-1  ',
	md: 'rounded-md text-sm px-2.5 py-1.5',
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
	name?: string;
	onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
	to?: string;
	type?: ButtonType;
	value?: string;
	children: ReactNode;
}

export default function Button({
	as = 'button',
	color = 'secondary',
	onClick,
	name,
	size = 'lg',
	to = '',
	type = 'button',
	value,
	children,
}: ButtonProps) {
	let colorClasses = colors[color];
	let sizeClasses = sizes[size];
	let commonClasses = `font-medium ${sizeClasses} ${colorClasses}`;

	if (as === 'link') {
		return (
			<Link to={to} className={commonClasses}>
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
