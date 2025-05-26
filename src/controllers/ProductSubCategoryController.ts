import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"
import {isWebUser} from "../types/auth"

class ProductSubCategoryController {
	private commonModelProductSubCategory

	private idColumnProductSubCategory: string = "productSubCategoryId"

	constructor() {
		this.commonModelProductSubCategory = new CommonModel(
			"ProductSubCategory",
			this.idColumnProductSubCategory,
			["name", "description"]
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

			const [productSubCategories] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const productSubCategories =
						await this.commonModelProductSubCategory.bulkCreate(
							transaction,
							payload,
							userId
						)

					return [productSubCategories]
				}
			)

			return response.successResponse({
				message: `Product sub-categories created successfully`,
				data: productSubCategories
			})
		} catch (error) {
			next(error)
		}
	}

	public async list(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			let mandatoryFilters: any = {}
			if (isWebUser(roleId)) {
				mandatoryFilters = {
					...mandatoryFilters,
					status: true
				}
			}

			const {filter, range, sort} = await listAPIPayload(req.body)

			const [productSubCategories, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelProductSubCategory.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							range,
							sort
						}),

						this.commonModelProductSubCategory.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							isCountOnly: true
						})
					])
				}
			)

			return response.successResponse({
				message: `Product sub-categories data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: productSubCategories
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {productSubCategoryId, ...restPayload} = req.body

			const [productSubCategory] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingProductSubCategory] =
						await this.commonModelProductSubCategory.list(transaction, {
							filter: {
								productSubCategoryId
							}
						})
					if (!existingProductSubCategory) {
						throw new BadRequestException("Product sub-category doesn't exist")
					}

					// update
					await this.commonModelProductSubCategory.updateById(
						transaction,
						restPayload,
						productSubCategoryId,
						userId
					)

					// get updated details
					const [productSubCategory] =
						await this.commonModelProductSubCategory.list(transaction, {
							filter: {
								productSubCategoryId
							}
						})

					return [productSubCategory]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: productSubCategory
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {productSubCategoryIds} = req.body

			if (!productSubCategoryIds?.length) {
				throw new BadRequestException(
					`Please select product sub-categories to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingProductSubCategories =
						await this.commonModelProductSubCategory.list(transaction, {
							filter: {
								productSubCategoryId: productSubCategoryIds
							}
						})
					if (!existingProductSubCategories.length) {
						const productSubCategoryIdsSet: Set<number> = new Set(
							existingProductSubCategories.map(
								(obj) => obj.productSubCategoryId
							)
						)
						throw new BadRequestException(
							`Selected product sub-categories not found: ${productSubCategoryIds.filter((productSubCategoryId) => !productSubCategoryIdsSet.has(productSubCategoryId))}`
						)
					}

					await this.commonModelProductSubCategory.softDeleteByIds(
						transaction,
						productSubCategoryIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Product sub-categories deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new ProductSubCategoryController()
