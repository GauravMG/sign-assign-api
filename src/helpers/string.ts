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
