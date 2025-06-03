import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class ProductBulkDiscountController {
	private commonModelProductBulkDiscount

	private idColumnProductBulkDiscount: string = "productBulkDiscountId"

	constructor() {
		this.commonModelProductBulkDiscount = new CommonModel(
			"ProductBulkDiscount",
			this.idColumnProductBulkDiscount,
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

			const [productBulkDiscounts, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [productBulkDiscounts, total] = await Promise.all([
						this.commonModelProductBulkDiscount.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelProductBulkDiscount.list(transaction, {
							filter,
							isCountOnly: true
						})
					])

					return [productBulkDiscounts, total]
				}
			)

			return response.successResponse({
				message: `Product bulk discount data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: productBulkDiscounts
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

			const [productBulkDiscount] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// mark existing discount for product as deleted
					await this.commonModelProductBulkDiscount.softDeleteByFilter(
						transaction,
						{
							productId
						},
						userId
					)

					// update
					await this.commonModelProductBulkDiscount.bulkCreate(
						transaction,
						[{productId, ...restPayload}],
						userId
					)

					// get updated details
					const [productBulkDiscount] =
						await this.commonModelProductBulkDiscount.list(transaction, {
							filter: {
								productId
							}
						})

					return [productBulkDiscount]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: productBulkDiscount
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {productBulkDiscountIds} = req.body

			if (!productBulkDiscountIds?.length) {
				throw new BadRequestException(
					`Please select product bulk discount to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingProductBulkDiscounts =
						await this.commonModelProductBulkDiscount.list(transaction, {
							filter: {
								productBulkDiscountId: productBulkDiscountIds
							}
						})
					if (!existingProductBulkDiscounts.length) {
						const productBulkDiscountIdsSet: Set<number> = new Set(
							existingProductBulkDiscounts.map(
								(obj) => obj.productBulkDiscountId
							)
						)
						throw new BadRequestException(
							`Selected product bulk discount not found: ${productBulkDiscountIds.filter((productBulkDiscountId) => !productBulkDiscountIdsSet.has(productBulkDiscountId))}`
						)
					}

					await this.commonModelProductBulkDiscount.softDeleteByIds(
						transaction,
						productBulkDiscountIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Product bulk discount deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new ProductBulkDiscountController()
