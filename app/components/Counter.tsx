import { useEffect, useId, useState } from 'react';

export default function Counter({
	min,
	max,
	name,
	defaultValue,
	onChange,
}: {
	min?: number;
	max?: number;
	name: string;
	defaultValue: number;
	onChange?: (count: number) => void;
}) {
	const [count, setCount] = useState(defaultValue);
	const id = useId();

	useEffect(() => {
		onChange?.(count);
	}, [count]);

	function handleMinus() {
		if (min !== undefined && count === min) return;
		setCount(count - 1);
	}

	function handlePlus() {
		if (max !== undefined && count === max) return;
		setCount(count + 1);
	}

	return (
		<div className="counter">
			<button
				type="button"
				className="counter__button"
				onClick={handleMinus}
			>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
					<path
						d="M16 12H8"
						stroke=""
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>
			<div className="counter__value">{count}</div>
			<button
				type="button"
				className="counter__button"
				onClick={handlePlus}
			>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
					<path
						d="M12 8V16"
						stroke=""
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<path
						d="M16 12H8"
						stroke=""
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>
			<input type="hidden" name={name} id={id} value={count} />
		</div>
	);
}
