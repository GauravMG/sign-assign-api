import {PrismaClient} from "@prisma/client"
import {
	NotificationServices,
	NotificationTypes
} from "../types/notification-services"
import {logMessage} from "../utils/Logger"

const prisma = new PrismaClient({
	log:
		process.env.NODE_ENV === "development"
			? ["query", "info", "warn", "error"]
			: []
})

async function seedNotificationService() {
	try {
		/* start seeding email outlook service */
		const outlookEmailNotificationServiceExists =
			await prisma.notificationService.findFirst({
				where: {
					service: NotificationServices.Outlook,
					serviceType: NotificationTypes.Email
				}
			})

		if (!outlookEmailNotificationServiceExists) {
			const notificationService: any = {
				service: NotificationServices.Outlook,
				serviceType: NotificationTypes.Email,
				host: "smtp.office365.com",
				port: "587",
				encryption: "tls",
				configuration: {
					to: [],
					body: "hello! this is a test template message for smtp check",
					from: "ted@signassign.com",
					subject: "Mailing services check",
					publicKey: "ted@signassign.com",
					privateKey: "Saif@53DMtus"
				},
				status: false
			}

			await prisma.notificationService.create({
				data: {
					...notificationService
				}
			})
		} else {
			await prisma.notificationService.update({
				where: {
					notificationServiceId:
						outlookEmailNotificationServiceExists.notificationServiceId // <-- use your actual ID or unique field
				},
				data: {
					status: false,
					updatedAt: new Date()
				}
			})
		}
		/* end seeding email outlook service */

		/* start seeding email google service */
		const googleEmailNotificationServiceExists =
			await prisma.notificationService.findFirst({
				where: {
					service: NotificationServices.Google,
					serviceType: NotificationTypes.Email
				}
			})

		if (!googleEmailNotificationServiceExists) {
			const notificationService: any = {
				service: NotificationServices.Google,
				serviceType: NotificationTypes.Email,
				host: "smtp.gmail.com",
				port: "587",
				encryption: "tls",
				configuration: {
					to: [],
					body: "hello! this is a test template message for smtp check",
					from: "noreply.signassign@gmail.com",
					subject: "Mailing services check",
					publicKey: "noreply.signassign@gmail.com",
					privateKey: "jbgemocnqenbfhci"
				},
				status: true
			}

			await prisma.notificationService.create({
				data: {
					...notificationService
				}
			})
		}
		/* end seeding email google service */

		logMessage("access", "Notification service seeding completed!")
	} catch (error) {
		if (error instanceof Error) {
			logMessage("error", `${error.message}`)
		} else {
			logMessage("error", `An unknown error occurred`)
		}
	}
}

export default seedNotificationService
