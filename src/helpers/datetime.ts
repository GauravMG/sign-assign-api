import {logMessage} from "../utils/Logger"

export function getTimeDifference(dateTimeString: string) {
	try {
		// Parse the datetime string into a valid Date object
		const specificTime: any = new Date(dateTimeString.replace(" ", "T")) // Add 'T' to make it ISO 8601 compliant
		const now: any = new Date()

		// Calculate the difference in milliseconds
		const differenceInMs: any = now - specificTime

		// Convert to units
		const seconds = Math.floor(differenceInMs / 1000)
		const minutes = Math.floor(seconds / 60)
		const hours = Math.floor(minutes / 60)
		const days = Math.floor(hours / 24)

		return {seconds, minutes, hours, days}
	} catch (error: any) {
		logMessage("error", error?.message.toString())
		throw error
	}
}

export function getTimeDifferenceBetween2Datestring(
	dateTimeString1: string,
	dateTimeString2: string
) {
	try {
		// Parse the datetime string into a valid Date object
		const dateTime1: any = new Date(dateTimeString1.replace(" ", "T")) // Add 'T' to make it ISO 8601 compliant
		const dateTime2: any = new Date(dateTimeString2.replace(" ", "T")) // Add 'T' to make it ISO 8601 compliant

		// Calculate the difference in milliseconds
		const differenceInMs: any = dateTime1 - dateTime2

		// Convert to units
		const seconds = Math.floor(differenceInMs / 1000)
		const minutes = Math.floor(seconds / 60)
		const hours = Math.floor(minutes / 60)
		const days = Math.floor(hours / 24)

		return {seconds, minutes, hours, days}
	} catch (error: any) {
		logMessage("error", error?.message.toString())
		throw error
	}
}

// Format the estimated arrival in Y-m-d H:i:s
export const formatDate = (date: Date): string => {
	try {
		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, "0") // Months are 0-indexed
		const day = String(date.getDate()).padStart(2, "0")
		const hours = String(date.getHours()).padStart(2, "0")
		const minutes = String(date.getMinutes()).padStart(2, "0")
		const seconds = String(date.getSeconds()).padStart(2, "0")
		return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
	} catch (error: any) {
		logMessage("error", error?.message.toString())
		throw error
	}
}

export function modifyDateTime(
	dateTimeString: string,
	minutesToModify: number
): string {
	try {
		const date = new Date(dateTimeString) // Ensure ISO format

		// Add or subtract minutes
		date.setMinutes(date.getMinutes() + minutesToModify)

		// Format the output correctly
		const formattedDate = date
			.toLocaleString("en-GB", {
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				hour12: false
			})
			.replace(",", "") // Remove comma

		return formattedDate
	} catch (error: any) {
		logMessage("error", error?.message.toString())
		throw error
	}
}
