export async function parseCSV(file: File) {
	const fileData = await file.text();
	const table = fileData.split('\r\n').map((row) => row.split(','));
	const header = table.shift();

	if (!header) {
		throw new Error('Unable to parse CSV file.');
	}

	const data = table.map((row) => {
		return header.reduce(
			(obj, key, index) => Object.assign(obj, { [key]: row[index] }),
			{}
		);
	});

	return data;
}
