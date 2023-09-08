export function standardizeMeasure(measure: string): {
	name: string;
	singular: string;
	abbreviation: string;
} {
	switch (measure) {
		case 'lbs':
		case 'LBS':
			return { name: 'pounds', singular: 'pound', abbreviation: 'lbs' };
		case 'mm':
			return {
				name: 'millimeters',
				singular: 'millimeter',
				abbreviation: 'mm',
			};
		case 'PC':
		case 'PCS':
			return { name: 'pieces', singular: 'piece', abbreviation: 'PCS' };
		case 'SF':
			return {
				name: 'square feet',
				singular: 'square foot',
				abbreviation: 'sq ft',
			};
		default:
			throw new Error(`Unsupported unit of measure provided: ${measure}`);
	}
}

export function splitMeasurement(measurement: string): {
	value: number;
	unitOfMeasure: {
		name: string;
		singular: string;
		abbreviation: string;
	};
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
