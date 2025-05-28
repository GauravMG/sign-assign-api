import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"
import {isWebUser} from "../types/auth"

class ProductController {
	private commonModelProduct
	private commonModelProductCategory
	private commonModelProductSubCategory
	private commonModelVariant
	private commonModelVariantMedia
	private commonModelVariantAttribute

	private idColumnProduct: string = "productId"
	private idColumnProductCategory: string = "productCategoryId"
	private idColumnProductSubCategory: string = "productSubCategoryId"
	private idColumnVariant: string = "variantId"
	private idColumnVariantMedia: string = "variantMediaId"
	private idColumnVariantAtribute: string = "variantAttributeId"

	constructor() {
		this.commonModelProduct = new CommonModel("Product", this.idColumnProduct, [
			"name",
			"description",
			"specification"
		])
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
		this.commonModelVariant = new CommonModel("Variant", this.idColumnVariant, [
			"name"
		])
		this.commonModelVariantMedia = new CommonModel(
			"VariantMedia",
			this.idColumnVariantMedia,
			[]
		)
		this.commonModelVariantAttribute = new CommonModel(
			"VariantAttribute",
			this.idColumnVariantAtribute,
			[]
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

			const {userId, roleId}: Headers = req.headers

			let mandatoryFilters: any = {}
			if (isWebUser(roleId)) {
				mandatoryFilters = {
					...mandatoryFilters,
					status: true
				}
			}

			const {
				filter: allFilter,
				range,
				sort,
				linkedEntities
			} = await listAPIPayload(req.body)
			const {attributeFilters, ...filter} = allFilter ?? {}

			const [products, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const customFiltersProduct: any[] = []
					if (attributeFilters && Object.keys(attributeFilters)?.length) {
						let customFiltersPairs: any[] = []
						for (const [variantAttributeId, values] of Object.entries(
							attributeFilters
						)) {
							if (Array.isArray(values) && values.length) {
								// If it's an array with values, use "in" filter
								customFiltersPairs.push({
									AND: [
										{variantAttributeId: Number(variantAttributeId)},
										{value: {in: values}}
									]
								})
							} else if (typeof values === "string" && values.trim() !== "") {
								// If it's a non-empty string, use "equals" filter
								customFiltersPairs.push({
									AND: [
										{variantAttributeId: Number(variantAttributeId)},
										{value: {equals: values}}
									]
								})
							}
						}
						let customFilters: any[] = []
						if (customFiltersPairs.length) {
							customFilters = [{
								OR: customFiltersPairs
							}]
						}

						if (customFilters?.length) {
							const variantAttributes =
								await this.commonModelVariantAttribute.list(transaction, {
									filter: {},
									customFilters,
									range: {
										all: true
									}
								})
							const variantIds: number[] = variantAttributes.map(
								(variantAttribute) => Number(variantAttribute.variantId)
							)

							if (variantIds?.length) {
								const variants = await this.commonModelVariant.list(transaction, {
									filter: {
										variantId: variantIds
									},
									range: {
										all: true
									}
								})
		
								if (variants?.length) {
									customFiltersProduct.push({
										productId: {
											in: variants.map((variant) => Number(variant.productId))
										}
									})
								}
							}
						}
					}

					let payloadProduct: any = {
						filter: {
							...mandatoryFilters,
							...filter
						}
					}
					if (customFiltersProduct?.length) {
						payloadProduct = {
							...payloadProduct,
							customFilters: customFiltersProduct
						}
					}

					let [products, total] = await Promise.all([
						this.commonModelProduct.list(transaction, {
							...payloadProduct,
							range,
							sort
						}),

						this.commonModelProduct.list(transaction, {
							...payloadProduct,
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

						let [productCategories, productSubCategories, variants] =
							await Promise.all([
								this.commonModelProductCategory.list(transaction, {
									filter: {
										...mandatoryFilters,
										productCategoryId: productCategoryIds
									},
									range: {
										all: true
									}
								}),

								this.commonModelProductSubCategory.list(transaction, {
									filter: {
										...mandatoryFilters,
										productSubCategoryId: productSubCategoryIds
									},
									range: {
										all: true
									}
								}),

								this.commonModelVariant.list(transaction, {
									filter: {
										...mandatoryFilters,
										productId: productIds
									},
									range: {
										all: true
									}
								})
							])

						const variantIds: number[] = []

						for (let i = 0; i < variants?.length; i++) {
							variantIds.push(variants[i].variantId)
						}

						const variantMedias = await this.commonModelVariantMedia.list(
							transaction,
							{
								filter: {
									...mandatoryFilters,
									variantId: variantIds
								},
								range: {
									all: true
								}
							}
						)

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

						const productVariantMediaMap = variantMedias.reduce(
							(acc, variantMedia) => {
								acc[variantMedia.variantId] = acc[variantMedia.variantId] || []
								acc[variantMedia.variantId].push(variantMedia)
								return acc
							},
							{}
						)

						variants = variants.map((variant) => ({
							...variant,
							variantMedias: productVariantMediaMap[variant.variantId] || []
						}))

						const productVariantMap = variants.reduce((acc, variant) => {
							acc[variant.productId] = acc[variant.productId] || []
							acc[variant.productId].push(variant)
							return acc
						}, {})

						products = products.map((product) => ({
							...product,
							productCategory:
								productCategoryMap.get(product.productCategoryId) || null,
							productSubCategory:
								productSubCategoryMap.get(product.productSubCategoryId) || null,
							variants: productVariantMap[product.productId] || []
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
