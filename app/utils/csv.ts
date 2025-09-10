import {
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import Papa from "papaparse";

/**d
 * Parse CSV file into array of objects with header keys.
 * - Auto-detects delimiter (comma, semicolon, tab).
 * - Trims all values.
 * - Skips empty lines.
 */
export async function parseCSV(file: File) {
  const fileData = await file.text();

  const result = Papa.parse(fileData, {
    header: true,           // use first row as keys
    skipEmptyLines: true,   // ignore empty rows
    dynamicTyping: false,   // keep all as strings
    transform: (val) => (val !== undefined ? val.trim() : val), // trim spaces
    delimiter: "",          // let Papa auto-detect , ; or tab
  });

  if (result.errors.length > 0) {
    console.error("CSV parse errors:", result.errors);
    throw new Error("Unable to parse CSV file correctly.");
  }

  return result.data as Record<string, string>[];
}

export async function getDataFromFileUpload(
  request: Request,
  controlName: string
) {
  const handler = unstable_createMemoryUploadHandler();
  const formData = await unstable_parseMultipartFormData(request, handler);
  const file = formData.get(controlName) as File;

  if (!file) {
    throw new Error(`No file uploaded with control name: ${controlName}`);
  }

  const data = await parseCSV(file);
  return data;
}
