import twilio from "twilio"
import {getActiveProvider} from "./ActiveNotification"
import {
	NotificationServiceDetails,
	NotificationTypes
} from "types/notification-services"

interface TwilioCred {
	accountSid: string
	authToken: string
	from: string
}

export default async function createMessage(
	body: string,
	receivers: string[]
): Promise<void> {
	try {
		// Await the promise returned by getActiveProvider
		const notificationData = await getActiveProvider(NotificationTypes.SMS)

		// Ensure the configuration is valid
		const config = notificationData?.configuration
		if (!config || !config.accountSid || !config.authToken || !config.from) {
			throw new Error("Twilio configuration is missing required fields.")
		}

		// Create a Twilio client
		const client = twilio(config.accountSid, config.authToken)

		// Send messages concurrently to all receivers
		await Promise.all(
			receivers.map((phone) =>
				client.messages.create({
					body,
					from: config.from,
					to: phone
				})
			)
		)
	} catch (error) {
		console.error("Twilio send error:", error)
		throw error
	}
}
