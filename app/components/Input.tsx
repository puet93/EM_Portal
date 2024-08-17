import React from 'react';

interface InputProps {
	id: string;
	name: string;
	label?: string;
	type?: string;
	autoFocus?: boolean;
	defaultValue?: string;
	disabled?: boolean;
	placeholder?: string;
	readOnly?: boolean;
	required?: boolean;
}

export function Input({
	id,
	name,
	label = '',
	type = 'text',
	autoFocus = false,
	disabled = false,
	defaultValue = '',
	placeholder = '',
	readOnly = false,
	required = false,
}: InputProps) {
	const commonClasses =
		'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:ring-2 focus:ring-inset focus:ring-sky-600 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:focus:ring-sky-500 sm:text-sm sm:leading-6';

	const disabledClasses = 'disabled:cursor-not-allowed';

	const inputClasses = `${commonClasses} ${
		disabled ? disabledClasses : ''
	}`.trim();

	const input = (
		<input
			id={id}
			name={name}
			type={type}
			defaultValue={defaultValue}
			autoFocus={autoFocus}
			className={inputClasses}
			placeholder={placeholder}
			disabled={disabled}
			readOnly={readOnly}
			required={required}
		/>
	);

	if (label) {
		return (
			<>
				<InputLabel htmlFor={id}>{label}</InputLabel>
				<div className="mt-2">{input}</div>
			</>
		);
	}

	return input;
}

interface InputLabelProps {
	htmlFor: string;
	children: React.ReactNode;
}

export function InputLabel({ htmlFor, children }: InputLabelProps) {
	return (
		<label
			htmlFor={htmlFor}
			className="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
		>
			{children}
		</label>
	);
}
