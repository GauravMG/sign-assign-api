import {PrismaClientTransaction} from "../lib/PrismaLib"
import CommonModel from "./CommonModel"

export default class UserModel {
	getBusinessByUserIds = async (
		transaction: PrismaClientTransaction,
		userIds: number[]
	) => {
		try {
			if (!userIds?.length) {
				return []
			}

			// get all business mappings by user ids
			const commonModelBusinessUserMapping = new CommonModel(
				"BusinessUserMapping",
				"businessUserMappingId",
				[]
			)
			const businessUserMappings = await commonModelBusinessUserMapping.list(
				transaction,
				{
					filter: {userId: userIds}
					// fields: ["businessId", "userId"]
				}
			)
			const businessIds: number[] = businessUserMappings?.map(
				(el) => el.businessId
			)
			if (!businessIds?.length) {
				return []
			}

			// get all businesses by ids
			const commonModelBusiness = new CommonModel("Business", "businessId", [
				"name",
				"type",
				"yearOfIncorporation",
				"address",
				"city",
				"state",
				"country"
			])
			const businesses = await commonModelBusiness.list(transaction, {
				filter: {businessId: businessIds}
			})
			if (!businesses?.length) {
				return []
			}

			const result = userIds.map((userId) => ({
				userId,
				business: businesses.find(
					(business) =>
						business.businessId ===
						businessUserMappings.find(
							(businessUserMapping) => businessUserMapping.userId === userId
						)?.businessId
				)
			}))

			return result
		} catch (error) {
			throw error
		}
	}
}
