import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class RelatedProductController {
	private commonModelRelatedProduct

	private idColumnRelatedProduct: string = "relatedProductId"

	constructor() {
		this.commonModelRelatedProduct = new CommonModel(
			"RelatedProduct",
			this.idColumnRelatedProduct,
			[]
		)

		this.save = this.save.bind(this)
		this.list = this.list.bind(this)
		this.delete = this.delete.bind(this)
	}

	public async save(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			let payload = Array.isArray(req.body) ? req.body : [req.body]

			const [relatedProducts] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// delete old entries
					await this.commonModelRelatedProduct.softDeleteByFilter(
						transaction,
						{
							productId: payload.map((el) => el.productId)
						},
						userId
					)

					// bulk create new entries
					const relatedProducts =
						await this.commonModelRelatedProduct.bulkCreate(
							transaction,
							payload,
							userId
						)

					return [relatedProducts]
				}
			)

			return response.successResponse({
				message: `Related product${payload.length > 1 ? "s" : ""} updated successfully`,
				data: relatedProducts
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

			const [relatedProducts, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelRelatedProduct.list(transaction, {
							filter,
							range,
							sort
						}),
						this.commonModelRelatedProduct.list(transaction, {
							filter,
							isCountOnly: true
						})
					])
				}
			)

			return response.successResponse({
				message: `Related product data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: relatedProducts
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {relatedProductIds} = req.body

			if (!relatedProductIds?.length) {
				throw new BadRequestException(
					`Please select related product to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingRelatedProduct =
						await this.commonModelRelatedProduct.list(transaction, {
							filter: {
								relatedProductId: relatedProductIds
							}
						})
					if (!existingRelatedProduct.length) {
						const relatedProductIdsSet: Set<number> = new Set(
							existingRelatedProduct.map((obj) => obj.relatedProductId)
						)
						throw new BadRequestException(
							`Selected related products not found: ${relatedProductIds.filter((relatedProductId) => !relatedProductIdsSet.has(relatedProductId))}`
						)
					}

					await this.commonModelRelatedProduct.softDeleteByIds(
						transaction,
						relatedProductIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Related products deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new RelatedProductController()
