export function combineArrays(arrays: any[][]): any[] {
	const combined: any[] = [];
	for (let i = 0; i < arrays.length; i++) {
		arrays.push(...arrays[i]);
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
