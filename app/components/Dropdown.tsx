import type { MouseEvent } from 'react';
import { useState } from 'react';
import { ChevronDownIcon } from './Icons';

export default function Dropdown({
	name,
	options,
}: {
	name: string;
	options: { value: string; label: string }[];
}) {
	const [isMenuVisible, setIsMenuVisible] = useState(true);
	const [value, setValue] = useState('');
	const [label, setLabel] = useState('');

	function handleClick() {
		setIsMenuVisible(!isMenuVisible);
	}

	function handleSelection(event: MouseEvent<HTMLDivElement>) {
		const el = event.currentTarget;
		const label = el.dataset.label;
		const value = el.dataset.value;
		if (typeof value === 'string' && value.length > 0) {
			setValue(value);
			setLabel(label);
		} else {
			setValue('');
			setLabel('');
		}
	}

	return (
		<div
			className={isMenuVisible ? 'dropdown active' : 'dropdown'}
			onClick={handleClick}
			tabIndex={0}
		>
			<input type="hidden" name={name} value={value} />
			<ChevronDownIcon />
			<div className={label ? 'dropdown-text active' : 'dropdown-text'}>
				{label ? label : 'Placeholder'}
			</div>

			<div
				className={
					isMenuVisible
						? 'dropdown-menu visible'
						: 'dropdown-menu hidden'
				}
			>
				{options.map((option) => (
					<div
						key={option.value}
						className={
							value !== option.value
								? 'dropdown-menu-item'
								: 'dropdown-menu-item selected'
						}
						data-label={option.label}
						data-value={option.value}
						onClick={handleSelection}
					>
						{option.label}
					</div>
				))}
			</div>
		</div>
	);
}
