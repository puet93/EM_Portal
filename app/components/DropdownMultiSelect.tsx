import { useReducer } from 'react';
import { ChevronDownIcon } from './Icons';

export default function DropdownMultiSelect({
	name,
	options,
	defaultValue = [],
}: {
	name: string;
	options: { value: string; label: string }[];
	defaultValue?: string[];
}) {
	const [selectedOptions, dispatch] = useReducer(reducer, defaultValue);

	function reducer(state: string[], action: { type: string; value: string }) {
		switch (action.type) {
			case 'select': {
				const found = state.find((option) => option === action.value);
				if (found) {
					return state;
				} else {
					return [...state, action.value];
				}
			}
			case 'deselect': {
				return state.filter((option) => option !== action.value);
			}
			default: {
				throw new Error('Unknown action');
			}
		}
	}

	// const handleEventListeners = useCallback(
	// 	(e: SyntheticEvent | KeyboardEvent) => {
	// 		if (e instanceof KeyboardEvent && e.code === 'Escape') {
	// 			// console.log('ESCAPE');
	// 			window.removeEventListener('click', handleEventListeners);
	// 			window.removeEventListener('keyup', handleEventListeners);
	// 			setIsMenuVisible(false);
	// 			return;
	// 		}

	// 		if (ref.current && !ref.current.contains(e.target)) {
	// 			// console.log('OUTSIDE CLICK');
	// 			window.removeEventListener('click', handleEventListeners);
	// 			window.removeEventListener('keyup', handleEventListeners);
	// 			setIsMenuVisible(false);
	// 			return;
	// 		}
	// 	},
	// 	[]
	// );

	// function handleClick() {
	// 	if (!isMenuVisible) {
	// 		// console.log('IF');
	// 		window.addEventListener('click', handleEventListeners);
	// 		window.addEventListener('keyup', handleEventListeners);
	// 		setIsMenuVisible(true);
	// 	} else {
	// 		// console.log('ELSE');
	// 		window.removeEventListener('click', handleEventListeners);
	// 		window.removeEventListener('keyup', handleEventListeners);
	// 		setIsMenuVisible(false);
	// 	}
	// }

	function handleSelection(event) {
		const el = event.currentTarget;
		const { value } = el.dataset;
		if (typeof value !== 'string') return;
		dispatch({ type: 'select', value });
	}

	function handleDeselect(event) {
		const el = event.currentTarget;
		const { value } = el.dataset;
		if (typeof value !== 'string') return;
		dispatch({ type: 'deselect', value });
	}

	return (
		<div className="dropdown" id="dropdown">
			<select
				hidden
				name={name}
				multiple
				value={selectedOptions}
				onChange={() => {}}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>

			<button
				type="button"
				popovertarget="mypopover"
				className="dropdown__marker"
			>
				<ChevronDownIcon />
			</button>

			{selectedOptions.length > 0 ? (
				<div>
					{selectedOptions.map((value) => {
						const matchingOption = options.find(
							(option) => option.value === value
						);
						return (
							<span
								className="option-tag"
								key={value}
								onClick={handleDeselect}
								data-value={value}
							>
								{matchingOption
									? matchingOption.label + ' '
									: 'Missing label'}

								<svg
									className="option-tag__svg"
									width="18"
									height="18"
									viewBox="0 0 18 18"
									fill="none"
								>
									<path
										d="M6 6L12 12"
										stroke=""
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path
										d="M12 6L6 12"
										stroke=""
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</span>
						);
					})}
				</div>
			) : null}

			<div role="listbox" id="mypopover" popover="auto">
				{options.map((option) => {
					const matchingOption = selectedOptions.find(
						(selected) => selected === option.value
					);
					return (
						<div
							className={
								matchingOption
									? 'dropdown-menu-item filtered'
									: 'dropdown-menu-item'
							}
							role="option"
							aria-selected={false}
							key={option.value}
							data-label={option.label}
							data-value={option.value}
							onClick={handleSelection}
						>
							{option.label}
						</div>
					);
				})}
			</div>
			{/* <div
				className={isMenuVisible ? 'dropdown active' : 'dropdown'}
				onClick={handleClick}
				tabIndex={0}
				ref={ref}
			>
				<select
					name={name}
					multiple
					value={selectedOptions}
					onChange={() => {}}
				>
					<div className="dropdown-text active">
						<button popovertarget="mypopover">
							Toggle the popover
						</button>
						{/* Selected:{' '}}
						{selectedOptions.map((selected) => (
							<button key={`${selected}-label`}>
								{selected}
								{/* <selectedOption
								// onClick={handleDeselect}
								// data-value={selected}
								>
								</selectedOption>}
							</button>
						))}
					</div>
					<datalist id="mypopover" popover>
						{options.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</datalist>
				</select>

				<ChevronDownIcon />

				<div className="dropdown-text active">
					Selected:{' '}
					{selectedOptions.map((selected) => (
						<button
							type="button"
							key={`${selected}-label`}
							onClick={handleDeselect}
							data-value={selected}
						>
							{selected}
						</button>
					))}
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
							popover
							behavior="listbox"
							key={option.value}
							className={
								selectedOptions.find(
									(selected) => selected === option.value
								)
									? 'dropdown-menu-item active filtered'
									: 'dropdown-menu-item'
							}
							data-label={option.label}
							data-value={option.value}
							onClick={handleSelection}
						>
							{option.label}
						</div>
					))}
				</div>}
			</div> */}
		</div>
	);
}
