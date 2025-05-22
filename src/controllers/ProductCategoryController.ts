import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class ProductCategoryController {
	private commonModelProductCategory
	private commonModelProductSubCategory

	private idColumnProductCategory: string = "productCategoryId"
	private idColumnProductSubCategory: string = "productSubCategoryId"

	constructor() {
		this.commonModelProductCategory = new CommonModel(
			"ProductCategory",
			this.idColumnProductCategory,
			["name", "description"]
		)
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

			const {filter, range, sort, linkedEntities} = await listAPIPayload(
				req.body
			)

			const [productCategories, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [productCategories, total] = await Promise.all([
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

					if (linkedEntities) {
						const productCategoryIds: number[] = productCategories.map(
							({productCategoryId}) => productCategoryId
						)

						let filterProductSubCategory: any = {
							productCategoryId: productCategoryIds
						}
						if ([true, false].indexOf(filter?.status) >= 0) {
							filterProductSubCategory = {
								...filterProductSubCategory,
								status: filter.status
							}
						}

						const productSubCategories =
							await this.commonModelProductSubCategory.list(transaction, {
								filter: filterProductSubCategory,
								range: {
									all: true
								}
							})

						productCategories = productCategories.map((productCategory) => ({
							...productCategory,
							productSubCategories: productSubCategories.filter(
								(productSubCategory) =>
									productSubCategory.productCategoryId ===
									productCategory.productCategoryId
							)
						}))
					}

					return [productCategories, total]
				}
			)

			return response.successResponse({
				message: `Product categories data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: productCategories
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

			const [productCategory] = await prisma.$transaction(
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
				data: productCategory
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
							existingProductCategories.map((obj) => obj.productCategoryId)
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
