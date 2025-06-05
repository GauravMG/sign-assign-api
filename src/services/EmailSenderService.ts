import ejs from "ejs"
import Mailjet from "node-mailjet"
import nodemailer from "nodemailer"
import path from "path"

import {BadRequestException} from "../lib/exceptions"
import {
	ActiveNotificationService,
	Configuration,
	EmailAddressData,
	EmailBodyDetails,
	EmailTransportConfiguration,
	NotificationServices,
	NotificationTypes
} from "../types/notification-services"
import {logMessage} from "../utils/Logger"
import {getActiveProvider} from "../lib/ActiveNotification"

async function sendEmailByNodemailer(configuration: Configuration) {
	try {
		if (!configuration.template) {
			configuration.template = "default.ejs"
		}

		// node mailer config
		const config: EmailTransportConfiguration = {
			host: configuration.host as string,
			port: parseInt(configuration.port as string),
			auth: {
				user: configuration?.publicKey as string,
				pass: configuration?.privateKey as string
			}
		}
		const transport = nodemailer.createTransport(config)

		const emailArr: EmailAddressData[] = []
		const ccEmailArr: string[] = []
		const bccEmailArr: string[] = []

		if (Array.isArray(configuration.emails)) {
			configuration.emails.forEach((email) => {
				emailArr.push({
					Email: email
				})
			})
		}

		if (Array.isArray(configuration?.cc)) {
			configuration.cc.forEach((email) => {
				ccEmailArr.push(email)
			})
		}

		if (Array.isArray(configuration.bcc)) {
			configuration.bcc?.forEach((email) => {
				bccEmailArr.push(email)
			})
		}

		return new Promise((resolve, reject) => {
			ejs.renderFile(
				path.join(process.cwd(), `views/email/en/${configuration.template}`),
				configuration.payload ?? {},
				(err, result) => {
					emailArr.forEach((_email) => {
						if (err) {
							logMessage("error", err?.message.toString())
							return reject(err)
						} else {
							const message: EmailBodyDetails = {
								from: configuration.from as string,
								to: _email.Email,
								cc: ccEmailArr,
								bcc: bccEmailArr,
								subject: configuration.subject as string,
								html: result,
								attachments: configuration.attachments
							}
							transport.sendMail(message, function (err1, info) {
								if (err1) {
									logMessage("error", err1?.message.toString())
									return reject(err1)
								} else {
									return resolve(info)
								}
							})
						}
					})
				}
			)
		})
	} catch (error: any) {
		logMessage("error", error?.message.toString())
		throw error
	}
}

async function sendEmailByMailjet(configuration: Configuration) {
	try {
		return new Promise(async (resolve, reject) => {
			if (!configuration.template) {
				configuration.template = "default.ejs"
			}

			const mailjet = Mailjet.apiConnect(
				configuration.publicKey as string,
				configuration.privateKey as string
			)
			const emailArr: EmailAddressData[] = []
			if (Array.isArray(configuration.emails)) {
				configuration.emails.forEach((email) => {
					emailArr.push({
						Email: email
					})
				})
			}

			// for Cc mails
			const ccEmailArr: EmailAddressData[] = []
			if (Array.isArray(configuration?.cc)) {
				configuration.cc.forEach((email) => {
					ccEmailArr.push({
						Email: email
					})
				})
			}

			// for Bcc mails
			const bccEmailArr: EmailAddressData[] = []

			if (Array.isArray(configuration?.bcc)) {
				configuration.bcc.forEach((email) => {
					bccEmailArr.push({
						Email: email
					})
				})
			}

			ejs.renderFile(
				path.join(process.cwd(), `views/email/en/${configuration.template}`),
				configuration.payload ?? {},
				(err, result) => {
					if (err) {
						return reject(err)
					}

					mailjet
						.post("send", {version: "v3.1"})
						.request({
							Messages: [
								{
									From: {
										Email: configuration.from
									},
									To: emailArr,
									Subject: configuration.subject,
									TextPart: configuration.body,
									HTMLPart: result
								}
							]
						})
						.then((result) => {
							return resolve(result.body)
						})
						.catch((err) => {
							return reject(err.response.data)
						})
				}
			)
		})
	} catch (error: any) {
		logMessage("error", error?.message.toString())
		throw error
	}
}

export async function sendEmail(
	template: string,
	subject: string,
	emails: string[],
	payload?: any
) {
	try {
		const notificationData: ActiveNotificationService = await getActiveProvider(
			NotificationTypes.Email
		)
		if (!notificationData) {
			throw new BadRequestException("Cannot send mail.")
		}

		const configuration: Configuration = {
			publicKey: notificationData.configuration?.publicKey,
			privateKey: notificationData.configuration?.privateKey,
			host: notificationData.host,
			port: notificationData.port,
			emails,
			template: template.endsWith(".ejs") ? template : `${template}.ejs`,
			from: notificationData.configuration?.from,
			subject,
			payload
		}

		switch (notificationData.service) {
			case NotificationServices.Google:
			case NotificationServices.Outlook:
				sendEmailByNodemailer(configuration)
				break
			case NotificationServices.Mailjet:
				sendEmailByMailjet(configuration)
				break
			default:
				throw new BadRequestException("Cannot send mail.")
		}
	} catch (error: any) {
		logMessage("error", error?.message.toString())
		// throw error
	}
}
