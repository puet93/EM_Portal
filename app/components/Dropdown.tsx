import type { KeyboardEvent, MouseEvent, SyntheticEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
	const ref = useRef(null);

	useEffect(() => {
		const label = options.find(
			(option) => option.value === defaultValue
		)?.label;
		label && setLabel(label);
	}, [defaultValue, options]);

	const handleEventListeners = useCallback(
		(e: SyntheticEvent | KeyboardEvent) => {
			if (e instanceof KeyboardEvent && e.code === 'Escape') {
				// console.log('ESCAPE');
				window.removeEventListener('click', handleEventListeners);
				window.removeEventListener('keyup', handleEventListeners);
				setIsMenuVisible(false);
				return;
			}

			if (ref.current && !ref.current.contains(e.target)) {
				// console.log('OUTSIDE CLICK');
				window.removeEventListener('click', handleEventListeners);
				window.removeEventListener('keyup', handleEventListeners);
				setIsMenuVisible(false);
				return;
			}
		},
		[]
	);

	function handleClick() {
		if (!isMenuVisible) {
			// console.log('IF');
			window.addEventListener('click', handleEventListeners);
			window.addEventListener('keyup', handleEventListeners);
			setIsMenuVisible(true);
		} else {
			// console.log('ELSE');
			window.removeEventListener('click', handleEventListeners);
			window.removeEventListener('keyup', handleEventListeners);
			setIsMenuVisible(false);
		}
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
			ref={ref}
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
