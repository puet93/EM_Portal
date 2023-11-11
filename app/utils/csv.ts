import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from '@remix-run/node';

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

export async function getDataFromFileUpload(
	request: Request,
	controlName: string
) {
	const handler = unstable_createMemoryUploadHandler();
	const formData = await unstable_parseMultipartFormData(request, handler);
	const file = formData.get(controlName) as File;
	const data = await parseCSV(file);
	return data;
}
