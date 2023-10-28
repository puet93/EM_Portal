import type { KeyboardEvent, MouseEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ChevronDownIcon } from './Icons';

export default function Dropdown({
	name,
	options,
	defaultValue,
}: {
	name: string;
	options: { value: string; label: string }[];
	defaultValue?: string;
}) {
	const [isMenuVisible, setIsMenuVisible] = useState(false);
	const [value, setValue] = useState(defaultValue || '');
	const [label, setLabel] = useState('');

	const handleKeyUp = useCallback((event: KeyboardEvent) => {
		if (event.code === 'Escape') {
			window.removeEventListener('keyup', handleKeyUp);
			setIsMenuVisible(false);
		}
	}, []);

	useEffect(() => {
		const label = options.find(
			(option) => option.value === defaultValue
		)?.label;
		label && setLabel(label);
	}, [defaultValue, options]);

	useEffect(() => {
		if (isMenuVisible) {
			window.addEventListener('keyup', handleKeyUp);
		}
	}, [handleKeyUp, isMenuVisible]);

	function handleClick() {
		window.removeEventListener('keyup', handleKeyUp);
		setIsMenuVisible(!isMenuVisible);
	}

	function handleSelection(event: MouseEvent<HTMLDivElement>) {
		const el = event.currentTarget;
		const { value, label } = el.dataset;

		if (
			typeof value === 'string' &&
			value.length > 0 &&
			typeof label === 'string' &&
			label.length > 0
		) {
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
