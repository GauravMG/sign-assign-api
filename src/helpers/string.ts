/**
 * Function to convert a snake_case string to kebab-case
 * @param input - The snake_case string to convert
 * @returns The converted kebab-case string
 */
export function snakeToKebab(input: string): string {
	if (typeof input !== "string") {
		throw new TypeError("Input must be a string")
	}
	return input.replace(/_/g, "-")
}

export const snakeToPascal = (snake: string): string => {
	return snake
		.split("_") // Split the string into parts using underscores
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize the first letter of each word
		.join(" ") // Join all parts without underscores
}

export function generateRandomNumber() {
	return Math.floor(Math.random() * (999 - 100 + 1)) + 100
}

export function normalToKebabCase(input: string): string {
	if (typeof input !== "string") {
		throw new TypeError("Input must be a string")
	}

	// Remove file extension
	const fileNameWithoutExtension = input.replace(/\.[^/.]+$/, "")

	return fileNameWithoutExtension
		.normalize("NFD") // Normalize to decompose accented characters
		.replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks (accents)
		.replace(/[^a-zA-Z0-9]+/g, "-") // Replace non-alphanumeric characters with hyphen
		.replace(/^-+|-+$/g, "") // Remove leading and trailing hyphens
		.toLowerCase() // Convert to lowercase
}
