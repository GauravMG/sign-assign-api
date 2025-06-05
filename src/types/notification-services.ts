import {Range, OrderDir, Manipulator, Timestamp} from "./common"

type Attachment = Partial<{
	filename: string
	content: string
	path: string
	contentType: string
	encoding: string
	raw: string
}>

export enum NotificationServices {
	Mailjet = "mailjet",
	Google = "google",
	Tiara = "tiara",
	Twilio = "twilio",
	Outlook = "outlook"
}

export enum NotificationTypes {
	Email = "email",
	SMS = "sms"
}

export type Configuration = Partial<{
	to: string[]
	from: string
	subject: string
	cc: string[]
	bcc: string[]
	method: string
	apiUrl: string
	body: string
	emails: string[]
	template: string
	file: string
	publicKey: string
	privateKey: string
	host?: string
	port?: string
	payload: any
	html: string
	attachments: Attachment[]
	accountSid?: string
	authToken?: string
}>

export type NotificationServiceTableData = {
	notificationServiceId: number
	service: string
	serviceType: string
	host: string
	port: string
	encryption: string
	configuration: Configuration
	status: boolean
} & Manipulator &
	Timestamp

export type NotificationServiceDetails = {
	notificationServiceId: number
	service: string
	serviceType: string
	host: string
	port: string
	encryption: string
	configuration: Configuration
	status: boolean
}

export type NotificationServiceShortDetails = {
	notificationServiceId: number
	service: string
	serviceType: string
	host: string
	port: string
	status: boolean
}

export type CreateNotificationServiceApiPayload = {
	serviceType: string
	service: string
	host?: string
	port?: string
	encryption?: string
	configuration?: Configuration
}

export type CreateNotificationServicePayload = {
	serviceType: string
	service: string
	host?: string
	port?: string
	encryption?: string
	configuration?: string
}

type FilterNotificationServicePayload = {
	notificationServiceId?: number[]
	search?: string
}

export type ListNotificationServicePayload = Partial<{
	filter: FilterNotificationServicePayload
	sort: Partial<{
		sortBy: "notificationServiceId" | "service" | "serviceType"
		orderDir: OrderDir
	}>
	range: Range
}>

export type UpdateNotificationServiceApiPayload = {
	notificationServiceId: number
	serviceType: string
	service: string
	host?: string
	port?: string
	encryption?: string
	configuration?: Configuration
}

export type UpdateNotificationServicePayload = {
	notificationServiceId: number
	serviceType: string
	service: string
	host?: string
	port?: string
	encryption?: string
	configuration?: string
}

export type DeleteNotificationServicePayload = {
	notificationServiceId: number
}

export type NotificationMappingData = {
	actionName: string
	configuration?: any
}

export type ActiveNotificationService = {
	service: string
	serviceType: string
	configuration?: Configuration
	host: string
	port: string
	encryption: string
}

export type EmailTransportConfiguration = {
	host: string
	port: number
	auth: {
		user: string
		pass: string
	}
}

export type EmailAddressData = {
	Email: string
}

export type EmailBodyDetails = {
	from: string
	to: string
	cc: string[]
	bcc: string[]
	subject: string
	html: string
	attachments?: Attachment[]
}

export type SendSMSPayload = {
	mobile: string
	message: string
}
