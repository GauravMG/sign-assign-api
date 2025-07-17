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
	private commonModelProductMedia
	private commonModelProductAttribute
	private commonModelAttribute
	private commonModelProductBulkDiscount
	private commonModelProductRushHourRate
	private commonModelRelatedProduct

	private idColumnProduct: string = "productId"
	private idColumnProductCategory: string = "productCategoryId"
	private idColumnProductSubCategory: string = "productSubCategoryId"
	private idColumnProductMedia: string = "productMediaId"
	private idColumnProductAtribute: string = "productAttributeId"
	private idColumnAttribute: string = "attributeId"
	private idColumnProductBulkDiscount: string = "productBulkDiscountId"
	private idColumnProductRushHourRate: string = "productRushHourRateId"
	private idColumnRelatedProduct: string = "relatedProductId"

	constructor() {
		this.commonModelProduct = new CommonModel("Product", this.idColumnProduct, [
			"name",
			"sku"
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
		this.commonModelProductMedia = new CommonModel(
			"ProductMedia",
			this.idColumnProductMedia,
			[]
		)
		this.commonModelProductAttribute = new CommonModel(
			"ProductAttribute",
			this.idColumnProductAtribute,
			[]
		)
		this.commonModelAttribute = new CommonModel(
			"Attribute",
			this.idColumnAttribute,
			[]
		)
		this.commonModelProductBulkDiscount = new CommonModel(
			"ProductBulkDiscount",
			this.idColumnProductBulkDiscount,
			[]
		)
		this.commonModelProductRushHourRate = new CommonModel(
			"ProductRushHourRate",
			this.idColumnProductRushHourRate,
			[]
		)
		this.commonModelRelatedProduct = new CommonModel(
			"RelatedProduct",
			this.idColumnRelatedProduct,
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
					let isAttributeFilterApplicable: boolean = false

					const customFiltersProduct: any[] = []
					if (attributeFilters && Object.keys(attributeFilters)?.length) {
						let customFiltersPairs: any[] = []
						for (const [productAttributeId, values] of Object.entries(
							attributeFilters
						)) {
							if (Array.isArray(values) && values.length) {
								isAttributeFilterApplicable = true

								// If it's an array with values, use "in" filter
								customFiltersPairs.push({
									AND: [
										{attributeId: Number(productAttributeId)},
										{value: {in: values}}
									]
								})
							} else if (typeof values === "string" && values.trim() !== "") {
								isAttributeFilterApplicable = true

								// If it's a non-empty string, use "equals" filter
								customFiltersPairs.push({
									AND: [
										{attributeId: Number(productAttributeId)},
										{value: {equals: values}}
									]
								})
							}
						}
						let customFilters: any[] = []
						if (customFiltersPairs.length) {
							customFilters = [
								{
									OR: customFiltersPairs
								}
							]
						}

						if (customFilters?.length) {
							const productAttributes =
								await this.commonModelProductAttribute.list(transaction, {
									filter: {},
									customFilters,
									range: {
										all: true
									}
								})
							const productIds: number[] = productAttributes.map(
								(productAttribute) => Number(productAttribute.productId)
							)

							if (productIds?.length) {
								customFiltersProduct.push({
									productId: {
										in: productIds
									}
								})
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

					let [products, total] =
						isAttributeFilterApplicable && !customFiltersProduct?.length
							? [[], 0]
							: await Promise.all([
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

						let [
							productCategories,
							productSubCategories,
							productMedias,
							productAttributes,
							productBulkDiscounts,
							productRushHourRates,
							relatedProducts
						] = await Promise.all([
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

							this.commonModelProductMedia.list(transaction, {
								filter: {
									...mandatoryFilters,
									productId: productIds
								},
								range: {
									all: true
								},
								sort: [
									{
										orderBy: "productId",
										orderDir: "asc"
									},
									{
										orderBy: "sequenceNumber",
										orderDir: "asc"
									}
								]
							}),

							this.commonModelProductAttribute.list(transaction, {
								filter: {
									...mandatoryFilters,
									productId: productIds
								},
								range: {
									all: true
								}
							}),

							this.commonModelProductBulkDiscount.list(transaction, {
								filter: {
									...mandatoryFilters,
									productId: productIds
								},
								range: {
									all: true
								}
							}),

							this.commonModelProductRushHourRate.list(transaction, {
								filter: {
									...mandatoryFilters,
									productId: productIds
								},
								range: {
									all: true
								}
							}),

							this.commonModelRelatedProduct.list(transaction, {
								filter: {
									...mandatoryFilters,
									productId: productIds
								},
								range: {
									all: true
								}
							})
						])

						const attributeIds: number[] = productAttributes.map(
							({attributeId}) => attributeId
						)

						const attributes = await this.commonModelAttribute.list(
							transaction,
							{
								filter: {
									...mandatoryFilters,
									attributeId: attributeIds
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

						const attributeMap = new Map<number, any>()
						for (const attribute of attributes) {
							attributeMap.set(attribute.attributeId, attribute)
						}

						productAttributes = productAttributes.map((productAttribute) => ({
							...productAttribute,
							attribute: attributeMap.get(productAttribute.attributeId) || null
						}))

						const productMediaMap = new Map<number, any[]>()
						for (const productMedia of productMedias) {
							const productMediaGroup =
								productMediaMap.get(productMedia.productId) || []
							productMediaGroup.push(productMedia)
							productMediaMap.set(productMedia.productId, productMediaGroup)
						}

						const productAttributeMap = new Map<number, any[]>()
						for (const productAttribute of productAttributes) {
							const productAttributeGroup =
								productAttributeMap.get(productAttribute.productId) || []
							productAttributeGroup.push(productAttribute)
							productAttributeMap.set(
								productAttribute.productId,
								productAttributeGroup
							)
						}

						const productBulkDiscountMap: any = new Map(
							productBulkDiscounts.map((productBulkDiscount) => [
								productBulkDiscount.productId,
								productBulkDiscount
							])
						)

						const productRushHourRateMap: any = new Map(
							productRushHourRates.map((productRushHourRate) => [
								productRushHourRate.productId,
								productRushHourRate
							])
						)

						let relatedProductIds: number[] = []
						relatedProducts.forEach((relatedProduct) => {
							if (relatedProduct.referenceType === "product") {
								relatedProductIds.push(Number(relatedProduct.referenceId))
							}
						})

						const [selectedProducts] = await Promise.all([
							this.commonModelProduct.list(transaction, {
								filter: {
									productId: relatedProductIds
								},
								range: {all: true}
							})
						])

						const selectedProductMap: any = new Map(
							selectedProducts.map((selectedProduct) => [
								selectedProduct.productId,
								selectedProduct
							])
						)

						const relatedProductMap = new Map<number, any[]>()
						for (let relatedProduct of relatedProducts) {
							if (relatedProduct.referenceType === "product") {
								relatedProduct = {
									...relatedProduct,
									referenceData: selectedProductMap.get(
										relatedProduct.referenceId
									)
								}
							}

							const relatedProductGroup =
								relatedProductMap.get(relatedProduct.productId) || []
							relatedProductGroup.push(relatedProduct)
							relatedProductMap.set(
								relatedProduct.productId,
								relatedProductGroup
							)
						}

						products = products.map((product) => {
							let productBulkDiscount =
								productBulkDiscountMap.get(product.productId)?.dataJson || []
							if (!productBulkDiscount) {
								productBulkDiscount = []
							}
							if (typeof productBulkDiscount === "string") {
								productBulkDiscount = JSON.parse(productBulkDiscount)
							}

							let productRushHourRate =
								productRushHourRateMap.get(product.productId)?.dataJson || []
							if (!productRushHourRate) {
								productRushHourRate = []
							}
							if (typeof productRushHourRate === "string") {
								productRushHourRate = JSON.parse(productRushHourRate)
							}

							return {
								...product,
								productCategory:
									productCategoryMap.get(product.productCategoryId) || null,
								productSubCategory:
									productSubCategoryMap.get(product.productSubCategoryId) ||
									null,
								productMedias: productMediaMap.get(product.productId) || [],
								productAttributes:
									productAttributeMap.get(product.productId) || [],
								productBulkDiscounts: productBulkDiscount.sort((a, b) => {
									if (a.minQty !== b.minQty) return a.minQty - b.minQty
									if (a.maxQty !== b.maxQty) return a.maxQty - b.maxQty
									return a.discount - b.discount
								}),
								productRushHourRates: productRushHourRate?.length
									? productRushHourRate.sort((a, b) => {
											if (a.minQty !== b.minQty) return a.minQty - b.minQty
											if (a.maxQty !== b.maxQty) return a.maxQty - b.maxQty
											return a.amount - b.amount
										})
									: [
											{
												amount: 50,
												maxQty: 999999,
												minQty: 1
											}
										],
								relatedProducts: relatedProductMap.get(product.productId) || []
							}
						})
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
