export default function Input({
	id,
	label,
	name,
	type,
	className,
	defaultValue,
}: {
	id: string;
	label: string;
	name: string;
	type?: string;
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
			/>
		</div>
	);
}
