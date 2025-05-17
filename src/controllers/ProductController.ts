import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class ProductController {
	private commonModelProduct
	private commonModelProductMedia
	private commonModelProductCategory
	private commonModelProductSubCategory

	private idColumnProduct: string = "productId"
	private idColumnProductMedia: string = "productMediaId"
	private idColumnProductCategory: string = "productCategoryId"
	private idColumnProductSubCategory: string = "productSubCategoryId"

	constructor() {
		this.commonModelProduct = new CommonModel("Product", this.idColumnProduct, [
			"name",
			"description",
			"specification"
		])
		this.commonModelProductMedia = new CommonModel(
			"ProductMedia",
			this.idColumnProductMedia,
			[]
		)
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

			const [product] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const product = await this.commonModelProduct.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [product]
				}
			)

			return response.successResponse({
				message: `Product created successfully`,
				data: product
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

			const [products, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [products, total] = await Promise.all([
						this.commonModelProduct.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelProduct.list(transaction, {
							filter,
							isCountOnly: true
						})
					])

					if (linkedEntities) {
						const productIds: number[] = []
						const productCategoryIds: number[] = []
						const productSubCategoryIds: number[] = []

						for (let i = 0; i < products?.length; i++) {
							productIds.push(products[i].productId)
							productCategoryIds.push(products[i].productCategoryId)
							productSubCategoryIds.push(products[i].productSubCategoryId)
						}

						const [productCategories, productSubCategories, productMedias] =
							await Promise.all([
								this.commonModelProductCategory.list(transaction, {
									filter: {
										productCategoryId: productCategoryIds
									},
									range: {
										all: true
									}
								}),

								this.commonModelProductSubCategory.list(transaction, {
									filter: {
										productSubCategoryId: productSubCategoryIds
									},
									range: {
										all: true
									}
								}),

								this.commonModelProductMedia.list(transaction, {
									filter: {
										productId: productIds
									},
									range: {
										all: true
									}
								})
							])

						const productCategoryMap = new Map(
							productCategories.map((productCategory) => [
								productCategory.productCategoryId,
								productCategory
							])
						)

						const productSubCategoryMap = new Map(
							productSubCategories.map((productSubCategory) => [
								productSubCategory.productSubCategoryId,
								productSubCategory
							])
						)

						const productMediaMap = new Map<number, any[]>()
						for (const productMedia of productMedias) {
							const productMediaGroup =
								productMediaMap.get(productMedia.productId) || []
							productMediaGroup.push(productMedia)
							productMediaMap.set(productMedia.productId, productMediaGroup)
						}

						products = products.map((product) => ({
							...product,
							productCategory:
								productCategoryMap.get(product.productCategoryId) || null,
							productSubCategory:
								productSubCategoryMap.get(product.productSubCategoryId) || null,
							productMedias: productMediaMap.get(product.productId) || []
						}))
					}

					return [products, total]
				}
			)

			return response.successResponse({
				message: `Product data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: products
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

			const [product] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingProduct] = await this.commonModelProduct.list(
						transaction,
						{
							filter: {
								productId
							}
						}
					)
					if (!existingProduct) {
						throw new BadRequestException("Product doesn't exist")
					}

					// update
					await this.commonModelProduct.updateById(
						transaction,
						restPayload,
						productId,
						userId
					)

					// get updated details
					const [product] = await this.commonModelProduct.list(transaction, {
						filter: {
							productId
						}
					})

					return [product]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: product
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {productIds} = req.body

			if (!productIds?.length) {
				throw new BadRequestException(`Please select product to be deleted`)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingProducts = await this.commonModelProduct.list(
						transaction,
						{
							filter: {
								productId: productIds
							}
						}
					)
					if (!existingProducts.length) {
						const productIdsSet: Set<number> = new Set(
							existingProducts.map((obj) => obj.productId)
						)
						throw new BadRequestException(
							`Selected product not found: ${productIds.filter((productId) => !productIdsSet.has(productId))}`
						)
					}

					await this.commonModelProduct.softDeleteByIds(
						transaction,
						productIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Product deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new ProductController()
