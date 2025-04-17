import * as fs from "fs"

// Function to read the file content
export function readFileContent(
	filePath: string,
	data?: Record<string, any>
): string | null {
	try {
		let fileContent = fs.readFileSync(filePath, "utf-8")

		if (data && Object.keys(data).length) {
			fileContent = fileContent.replace(
				/<%-\s*(\w+)\s*-%>/g,
				(_, key) => data[key] || ""
			)
		}

		return fileContent
	} catch (error) {
		throw error
	}
}
