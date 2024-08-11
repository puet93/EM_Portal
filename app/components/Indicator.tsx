const colors = {
	emerald: { outer: 'bg-emerald-500/20', inner: 'bg-emerald-500' },
	gray: {
		outer: 'bg-gray-200 dark:bg-zinc-100/10',
		inner: 'bg-gray-500 dark:bg-zinc-500',
	},
};

interface IndicatorProps {
	color?: 'emerald' | 'gray';
}

export function Indicator({ color = 'gray' }: IndicatorProps) {
	let colorClassesOuter = colors[color].outer;
	let colorClassesInner = colors[color].inner;

	return (
		<div className={`flex-none rounded-full ${colorClassesOuter} p-1`}>
			<div
				className={`h-1.5 w-1.5 rounded-full ${colorClassesInner}`}
			></div>
		</div>
	);
}
