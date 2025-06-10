import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class UserDiscountController {
	private commonModelUserDiscount

	private idColumnUserDiscount: string = "userDiscountId"

	constructor() {
		this.commonModelUserDiscount = new CommonModel(
			"UserDiscount",
			this.idColumnUserDiscount,
			[]
		)

		this.update = this.update.bind(this)
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const payload = req.body

			const [userDiscount] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingUserDiscount] =
						await this.commonModelUserDiscount.list(transaction, {
							filter: {
								userId: payload.userId
							}
						})
					if (existingUserDiscount) {
						await this.commonModelUserDiscount.softDeleteByIds(
							transaction,
							[existingUserDiscount.userDiscountId],
							userId
						)
					}

					await this.commonModelUserDiscount.bulkCreate(
						transaction,
						[payload],
						userId
					)

					// get updated details
					const [userDiscount] = await this.commonModelUserDiscount.list(
						transaction,
						{
							filter: {
								userId: payload.userId
							}
						}
					)

					return [userDiscount]
				}
			)

			return response.successResponse({
				message: `Discount updated successfully`,
				data: userDiscount
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new UserDiscountController()
