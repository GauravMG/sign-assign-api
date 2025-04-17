export function generateOTP(length: number = 6): string {
	const min = Math.pow(10, length - 1) // Smallest number with the desired length
	const max = Math.pow(10, length) - 1 // Largest number with the desired length
	return Math.floor(min + Math.random() * (max - min + 1)).toString()
}
