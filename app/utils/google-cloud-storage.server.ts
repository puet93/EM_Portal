import { Storage } from '@google-cloud/storage';

if (
	!process.env.GOOGLE_CLOUD_CREDENTIALS ||
	typeof process.env.GOOGLE_CLOUD_CREDENTIALS !== 'string'
) {
	throw new Error('Invalid Google Cloud Storage credentials');
}

const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);

// Initialize Google Cloud Storage
const storage = new Storage({
	projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
	credentials: credentials,
});

if (
	!process.env.GOOGLE_CLOUD_BUCKET ||
	typeof process.env.GOOGLE_CLOUD_BUCKET !== 'string'
) {
	throw new Error('Invalid Google Cloud Storage bucket name');
}

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET);

export async function uploadTestFile() {
	try {
		// Create a buffer from the content you want to upload
		const fileContent = Buffer.from('Hello, Google Cloud Storage!', 'utf8');

		// Define the destination file path in the bucket
		const destination = 'test-file.txt';

		// Upload the file to your bucket
		const file = bucket.file(destination);
		await file.save(fileContent);

		console.log(`File uploaded to ${destination}`);
		return file.publicUrl();
	} catch (error) {
		console.error('Error uploading file:', error);
	}
}

export async function retrieveTestFile() {
	try {
		// Define the destination file path in the bucket
		const file = bucket.file('test-file.txt');

		// Download the file content
		const [contents] = await file.download();
		console.log('Downloaded file contents:', contents.toString());
	} catch (error) {
		console.error('Error downloading file:', error);
	}
}

export async function uploadFileToGCS(file: Buffer, destination: string) {
	const fileUpload = bucket.file(destination);
	await fileUpload.save(file);
	const [url] = await fileUpload.getSignedUrl({
		action: 'read',
		expires: Date.now() + 24 * 1000 * 60 * 60, // 24 hours
	});

	return url;
}