import {encoding_for_model} from "tiktoken"

// Estimate tokens for GPT-4, GPT-3.5, etc.
const enc = encoding_for_model("gpt-3.5-turbo")

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

export function randomString(length: number) {
	return Math.round(
		Math.pow(36, length + 1) - Math.random() * Math.pow(36, length)
	)
		.toString(36)
		.slice(1)
}

export function chunkTextByTokens(text: string, maxTokens = 1000): string[] {
	const tokens = enc.encode(text)
	const chunks: string[] = []

	for (let i = 0; i < tokens.length; i += maxTokens) {
		const chunkTokens = tokens.slice(i, i + maxTokens)
		const bytes = enc.decode(chunkTokens) // Uint8Array
		const chunk = new TextDecoder().decode(bytes) // string
		chunks.push(chunk)
	}

	return chunks
}
