import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class ProductRushHourRateController {
	private commonModelProductRushHourRate

	private idColumnProductRushHourRate: string = "productRushHourRateId"

	constructor() {
		this.commonModelProductRushHourRate = new CommonModel(
			"ProductRushHourRate",
			this.idColumnProductRushHourRate,
			[]
		)

		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
		this.delete = this.delete.bind(this)
	}

	public async list(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {roleId}: Headers = req.headers

			const {filter, range, sort} = await listAPIPayload(req.body)

			const [productRushHourRates, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [productRushHourRates, total] = await Promise.all([
						this.commonModelProductRushHourRate.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelProductRushHourRate.list(transaction, {
							filter,
							isCountOnly: true
						})
					])

					return [productRushHourRates, total]
				}
			)

			return response.successResponse({
				message: `Product rush hour rate data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: productRushHourRates
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {productId, ...restPayload} = req.body

			const [productRushHourRate] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// mark existing rush hour rate for product as deleted
					await this.commonModelProductRushHourRate.softDeleteByFilter(
						transaction,
						{
							productId
						},
						userId
					)

					// update
					await this.commonModelProductRushHourRate.bulkCreate(
						transaction,
						[{productId, ...restPayload}],
						userId
					)

					// get updated details
					const [productRushHourRate] =
						await this.commonModelProductRushHourRate.list(transaction, {
							filter: {
								productId
							}
						})

					return [productRushHourRate]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: productRushHourRate
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {productRushHourRateIds} = req.body

			if (!productRushHourRateIds?.length) {
				throw new BadRequestException(
					`Please select product rush hour rate to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingProductRushHourRates =
						await this.commonModelProductRushHourRate.list(transaction, {
							filter: {
								productRushHourRateId: productRushHourRateIds
							}
						})
					if (!existingProductRushHourRates.length) {
						const productRushHourRateIdsSet: Set<number> = new Set(
							existingProductRushHourRates.map(
								(obj) => obj.productRushHourRateId
							)
						)
						throw new BadRequestException(
							`Selected product rush hour rate not found: ${productRushHourRateIds.filter((productRushHourRateId) => !productRushHourRateIdsSet.has(productRushHourRateId))}`
						)
					}

					await this.commonModelProductRushHourRate.softDeleteByIds(
						transaction,
						productRushHourRateIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Product rush hour rate deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new ProductRushHourRateController()
