export function splitFullName(fullName: string) {
	// Trim spaces and split into name parts
	const nameParts: string[] = fullName.trim().split(/\s+/) // Use regex to handle multiple spaces

	// If there's only one part, it's the first name; no last name
	const firstName: string = nameParts[0] || ""
	const lastName: string =
		nameParts.length > 1 ? nameParts.slice(1).join(" ") : ""

	return {firstName, lastName}
}

export function createFullName({
	firstName,
	lastName
}: {
	firstName: string
	lastName: string
}): string {
	// Trim both parts and filter out any empty values before joining
	return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ")
}

export function generateReferralCode(userId, length = 6) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	let randomPart = ""

	// Generate a random alphanumeric part
	for (let i = 0; i < length; i++) {
		randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
	}

	// Convert userId to a Base36 string for uniqueness
	const userPart = Number(userId).toString(36).toUpperCase()

	// Combine both parts
	return `${randomPart}${userPart}`
}
