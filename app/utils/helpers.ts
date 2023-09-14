export function combineArrays(arrays: any[]): any[] {
	const combined = [];
	for (let i = 0; i < arrays.length; i++) {
		combined.push(...arrays[i]);
	}
	return combined;
}

export function standardizeQueryString(query: string): string {
	const formattedQuery = query
		.trim()
		.replace(/\s+/g, ' ')
		.replaceAll(' ,', ',');

	return formattedQuery
		.replaceAll(', ', ',')
		.replaceAll(',', '|')
		.replaceAll(' ', '&');
}

export function toCapitalCase(string: string) {
	const lowercased = string.toLowerCase();
	const words = lowercased.split(' ');
	const capitalizedWords = words.map((word) => {
		const firstLetter = word.charAt(0).toUpperCase();
		return firstLetter + word.slice(1, word.length);
	});
	return capitalizedWords.join(' ');
}

export function unstable_splitSizeCell(cell: string) {
	const regex = /^\d+(\.\d)?x\d+(\.\d)?$/gi;
	const splits = cell.split(' ');
	const size = splits[0].match(regex)[0];
	const xString = RegExp('x', 'i');
	const dimensions = size.split(xString);
	return { width: dimensions[0], length: dimensions[1] };
}

export function calculatePricePerCarton(
	listPrice: number,
	factoryDiscount: number,
	margin: number,
	factor: number,
	measurementValue: number
): number {
	const cost = listPrice * (1 - factoryDiscount);
	const price = (cost / (1 - margin)) * factor * measurementValue;
	return Number(price.toFixed(2));
}
