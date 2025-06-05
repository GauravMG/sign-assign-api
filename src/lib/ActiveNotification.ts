import {PrismaClientTransaction, prisma} from "./PrismaLib"
import {BadRequestException} from "./exceptions"
import CommonModel from "../models/CommonModel"
import {
	ActiveNotificationService,
	NotificationServiceDetails,
	NotificationTypes
} from "../types/notification-services"
import {logMessage} from "../utils/Logger"

// get active provider with config
export async function getActiveProvider(serviceType: NotificationTypes) {
	try {
		const commonModelNotificationService = new CommonModel(
			"NotificationService",
			"notificationServiceId",
			[]
		)

		const [detailData] = await prisma.$transaction(
			async (transaction: PrismaClientTransaction) => {
				const activeNotificationService: NotificationServiceDetails[] =
					await commonModelNotificationService.list(transaction, {
						filter: {
							status: true,
							isActive: true,
							serviceType: serviceType
						}
					})
				if (!activeNotificationService?.length) {
					throw new BadRequestException(`Cannot send ${serviceType}`)
				}
				const detailData: ActiveNotificationService = {
					service: activeNotificationService[0]?.service,
					serviceType: activeNotificationService[0]?.serviceType,
					configuration: activeNotificationService[0]?.configuration,
					host: activeNotificationService[0]?.host,
					port: activeNotificationService[0]?.port,
					encryption: activeNotificationService[0]?.encryption
				}

				return [detailData]
			}
		)
		return detailData
	} catch (error: any) {
		logMessage("error", error?.message.toString())
		throw error
	}
}
