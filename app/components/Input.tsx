import React from 'react';

const commonClasses =
	'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:ring-2 focus:ring-inset focus:ring-sky-600 dark:bg-white/5 dark:text-white dark:ring-white/10 dark:focus:ring-sky-500 sm:text-sm sm:leading-6';

interface InputProps {
	id: string;
	name: string;
	form?: string;
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
	form,
	label = '',
	type = 'text',
	autoFocus = false,
	disabled = false,
	defaultValue = '',
	placeholder = '',
	readOnly = false,
	required = false,
}: InputProps) {
	const disabledClasses = 'disabled:cursor-not-allowed';

	const inputClasses = `${commonClasses} ${
		disabled ? disabledClasses : ''
	}`.trim();

	const input = (
		<input
			id={id}
			name={name}
			type={type}
			form={form || undefined}
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
				<Label htmlFor={id}>{label}</Label>
				<div className="mt-2">{input}</div>
			</>
		);
	}

	return input;
}

interface LabelProps {
	htmlFor: string;
	children: React.ReactNode;
}

export function Label({ htmlFor, children }: LabelProps) {
	return (
		<label
			htmlFor={htmlFor}
			className="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
		>
			{children}
		</label>
	);
}

interface Option {
	value: string;
	label: string;
}

interface SelectProps {
	id: string;
	name: string;
	options: Option[];
	defaultValue?: string;
}

export function Select({ id, name, options, defaultValue }: SelectProps) {
	return (
		<select
			id={id}
			name={name}
			className={commonClasses}
			defaultValue={defaultValue}
		>
			{options.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	);
}
