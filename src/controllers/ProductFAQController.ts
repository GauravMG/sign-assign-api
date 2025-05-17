import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class ProductFAQController {
	private commonModelProductFAQ

	private idColumnProductFAQ: string = "productFAQId"

	constructor() {
		this.commonModelProductFAQ = new CommonModel(
			"ProductFAQ",
			this.idColumnProductFAQ,
			["question", "answer"]
		)

		this.create = this.create.bind(this)
		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
		this.delete = this.delete.bind(this)
	}

	public async create(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			let payload = Array.isArray(req.body) ? req.body : [req.body]

			const [productFAQ] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const productFAQ = await this.commonModelProductFAQ.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [productFAQ]
				}
			)

			return response.successResponse({
				message: `Product FAQ created successfully`,
				data: productFAQ
			})
		} catch (error) {
			next(error)
		}
	}

	public async list(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {roleId}: Headers = req.headers

			const {filter, range, sort} = await listAPIPayload(req.body)

			const [productFAQs, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [productFAQs, total] = await Promise.all([
						this.commonModelProductFAQ.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelProductFAQ.list(transaction, {
							filter,
							isCountOnly: true
						})
					])

					return [productFAQs, total]
				}
			)

			return response.successResponse({
				message: `Product FAQ data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: productFAQs
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {productFAQId, ...restPayload} = req.body

			const [productFAQ] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingProductFAQ] = await this.commonModelProductFAQ.list(
						transaction,
						{
							filter: {
								productFAQId
							}
						}
					)
					if (!existingProductFAQ) {
						throw new BadRequestException("Product FAQ doesn't exist")
					}

					// update
					await this.commonModelProductFAQ.updateById(
						transaction,
						restPayload,
						productFAQId,
						userId
					)

					// get updated details
					const [productFAQ] = await this.commonModelProductFAQ.list(
						transaction,
						{
							filter: {
								productFAQId
							}
						}
					)

					return [productFAQ]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: productFAQ
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {productFAQIds} = req.body

			if (!productFAQIds?.length) {
				throw new BadRequestException(`Please select product faq to be deleted`)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingProductFAQs = await this.commonModelProductFAQ.list(
						transaction,
						{
							filter: {
								productFAQId: productFAQIds
							}
						}
					)
					if (!existingProductFAQs.length) {
						const productFAQIdsSet: Set<number> = new Set(
							existingProductFAQs.map((obj) => obj.productFAQId)
						)
						throw new BadRequestException(
							`Selected product faq not found: ${productFAQIds.filter((productFAQId) => !productFAQIdsSet.has(productFAQId))}`
						)
					}

					await this.commonModelProductFAQ.softDeleteByIds(
						transaction,
						productFAQIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Product FAQ deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new ProductFAQController()
