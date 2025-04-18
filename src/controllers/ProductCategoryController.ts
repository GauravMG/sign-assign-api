import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class ProductCategoryController {
	private commonModelProductCategory

	private idColumnProductCategory: string = "productCategoryId"

	constructor() {
		this.commonModelProductCategory = new CommonModel(
			"ProductCategory",
			this.idColumnProductCategory,
			["name"]
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

			const [productCategories] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const productCategories =
						await this.commonModelProductCategory.bulkCreate(
							transaction,
							payload,
							userId
						)

					return [productCategories]
				}
			)

			return response.successResponse({
				message: `Product categories created successfully`,
				data: productCategories
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

			const [roles, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelProductCategory.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelProductCategory.list(transaction, {
							filter,
							isCountOnly: true
						})
					])
				}
			)

			return response.successResponse({
				message: `Product categories data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: roles
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {productCategoryId, ...restPayload} = req.body

			const [role] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingProductCategory] =
						await this.commonModelProductCategory.list(transaction, {
							filter: {
								productCategoryId
							}
						})
					if (!existingProductCategory) {
						throw new BadRequestException("Product category doesn't exist")
					}

					// update
					await this.commonModelProductCategory.updateById(
						transaction,
						restPayload,
						productCategoryId,
						userId
					)

					// get updated details
					const [productCategory] = await this.commonModelProductCategory.list(
						transaction,
						{
							filter: {
								productCategoryId
							}
						}
					)

					return [productCategory]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: role
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {productCategoryIds} = req.body

			if (!productCategoryIds?.length) {
				throw new BadRequestException(
					`Please select product categories to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingProductCategories =
						await this.commonModelProductCategory.list(transaction, {
							filter: {
								productCategoryId: productCategoryIds
							}
						})
					if (!existingProductCategories.length) {
						const productCategoryIdsSet: Set<number> = new Set(
							existingProductCategories.map((obj) => obj.userId)
						)
						throw new BadRequestException(
							`Selected product categories not found: ${productCategoryIds.filter((productCategoryId) => !productCategoryIdsSet.has(productCategoryId))}`
						)
					}

					await this.commonModelProductCategory.softDeleteByIds(
						transaction,
						productCategoryIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Product categories deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new ProductCategoryController()
