import twilio from "twilio"

interface TwilioCred {
	accountSid: string
	authToken: string
	fromNumber: string
}

export default async function createMessage(
	cred: TwilioCred,
	body: string,
	receivers: string[]
): Promise<void> {
	try {
		const client = twilio(cred.accountSid, cred.authToken)

		await Promise.all(
			receivers.map((phone) =>
				client.messages.create({
					body,
					from: cred.fromNumber,
					to: phone
				})
			)
		)
	} catch (error) {
		console.error("Twilio send error:", error)
		throw error
	}
}
