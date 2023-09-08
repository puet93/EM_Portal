export function toCapitalCase(string: string) {
	const lowercased = string.toLowerCase();
	const words = lowercased.split(' ');
	const capitalizedWords = words.map((word) => {
		const firstLetter = word.charAt(0).toUpperCase();
		return firstLetter + word.slice(1, word.length);
	});
	return capitalizedWords.join(' ');
}
