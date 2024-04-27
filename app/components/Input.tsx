export default function Input({
	id,
	label,
	name,
	type,
	autoFocus = false,
	className,
	defaultValue,
}: {
	id: string;
	label: string;
	name: string;
	type?: string;
	autoFocus?: boolean;
	className?: string;
	defaultValue?: string;
}) {
	return (
		<div className={className || 'input'}>
			<label htmlFor={id}>{label}</label>
			<input
				id={id}
				name={name}
				type={type || 'text'}
				defaultValue={defaultValue}
				autoFocus={autoFocus}
			/>
		</div>
	);
}
