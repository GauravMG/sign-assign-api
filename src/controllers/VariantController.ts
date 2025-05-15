import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class VariantController {
	private commonModelVariant

	private idColumnVariant: string = "variantId"

	constructor() {
		this.commonModelVariant = new CommonModel("Variant", this.idColumnVariant, [
			"sku", // stock units
			"price",
			"stockQuantity"
		])

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

			const [variants] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const variants = await this.commonModelVariant.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [variants]
				}
			)

			return response.successResponse({
				message: `Variant(s) created successfully`,
				data: variants
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

			const [variants, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelVariant.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelVariant.list(transaction, {
							filter,
							isCountOnly: true
						})
					])
				}
			)

			return response.successResponse({
				message: `Variant(s) data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: variants
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {variantId, ...restPayload} = req.body

			const [variant] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingVariant] = await this.commonModelVariant.list(
						transaction,
						{
							filter: {
								variantId
							}
						}
					)
					if (!existingVariant) {
						throw new BadRequestException("Variant doesn't exist")
					}

					// update
					await this.commonModelVariant.updateById(
						transaction,
						restPayload,
						variantId,
						userId
					)

					// get updated details
					const [variant] = await this.commonModelVariant.list(transaction, {
						filter: {
							variantId
						}
					})

					return [variant]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: variant
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {variantIds} = req.body

			if (!variantIds?.length) {
				throw new BadRequestException(`Please select variant(s) to be deleted`)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingVariants = await this.commonModelVariant.list(
						transaction,
						{
							filter: {
								variantId: variantIds
							}
						}
					)
					if (!existingVariants.length) {
						const variantIdsSet: Set<number> = new Set(
							existingVariants.map((obj) => obj.userId)
						)
						throw new BadRequestException(
							`Selected Variant(s) not found: ${variantIds.filter((variantId) => !variantIdsSet.has(variantId))}`
						)
					}

					await this.commonModelVariant.softDeleteByIds(
						transaction,
						variantIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Variant(s) deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new VariantController()
