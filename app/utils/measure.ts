export function standardizeMeasure(measure: string): string {
	switch (measure) {
		case 'lbs':
		case 'LBS':
			return 'pounds';
		case 'mm':
			return 'millimeters';
		case 'PC':
		case 'PCS':
			return 'pieces';
		case 'SF':
			return 'square feet';
		default:
			throw new Error(`Unsupported unit of measure provided: ${measure}`);
	}
}

export function splitMeasurement(measurement: string): {
	value: number;
	unitOfMeasure: string;
} {
	const valueRegex = measurement.match(/\d+/g);
	const valueRegexMatch = valueRegex ? valueRegex[0] : null;
	const value = valueRegexMatch ? Number(valueRegexMatch) : null;

	if (typeof value !== 'number') {
		throw new Error('Unable to parse measurement value.');
	}

	const uomRegex = measurement.match(/[a-zA-Z]+/g);
	const uomRegexMatch = uomRegex ? uomRegex[0] : null;

	if (typeof uomRegexMatch !== 'string') {
		throw new Error('Unable to parse unit of measure.');
	}

	let unitOfMeasure = standardizeMeasure(uomRegexMatch);

	return { value, unitOfMeasure };
}
