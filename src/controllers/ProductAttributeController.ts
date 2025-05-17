import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class ProductAttributeController {
	private commonModelProductAttribute
	private commonModelProduct
	private commonModelAttribute

	private idColumnProductAttribute: string = "productAttributeId"
	private idColumnProduct: string = "productId"
	private idColumnAttribute: string = "attributeId"

	constructor() {
		this.commonModelProductAttribute = new CommonModel(
			"ProductAttribute",
			this.idColumnProductAttribute,
			["value"]
		)
		this.commonModelProduct = new CommonModel("Product", this.idColumnProduct, [
			"name",
			"description"
		])
		this.commonModelAttribute = new CommonModel(
			"Attribute",
			this.idColumnAttribute,
			["sku", "price"]
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

			const [productAttributes] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const productAttributes =
						await this.commonModelProductAttribute.bulkCreate(
							transaction,
							payload,
							userId
						)

					return [productAttributes]
				}
			)

			return response.successResponse({
				message: `Product attribute(s) created successfully`,
				data: productAttributes
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

			let [productAttributes, total, products, attributes] =
				await prisma.$transaction(
					async (transaction: PrismaClientTransaction) => {
						return await Promise.all([
							this.commonModelProductAttribute.list(transaction, {
								filter,
								range,
								sort
							}),

							this.commonModelProductAttribute.list(transaction, {
								filter,
								isCountOnly: true
							}),
							this.commonModelProduct.list(transaction, {
								filter: {}
							}),
							this.commonModelAttribute.list(transaction, {
								filter: {}
							})
						])
					}
				)
			const getProductById = (id: number) => {
				return products.find((product) => id === product.productId)
			}
			const getAttributeById = (id: number) => {
				return attributes.find((attribute) => id === attribute.attributeId)
			}
			productAttributes = productAttributes.map((el) => {
				return {
					...el,
					productDetails: getProductById(el.productId),
					attributeDetails: getAttributeById(el.attributeId)
				}
			})

			return response.successResponse({
				message: `Product attribute(s) data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: productAttributes
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {productAttributeId, ...restPayload} = req.body

			const [productAttribute] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingProductAttribute] =
						await this.commonModelProductAttribute.list(transaction, {
							filter: {
								productAttributeId
							}
						})
					if (!existingProductAttribute) {
						throw new BadRequestException("Product attribute doesn't exist")
					}

					// update
					await this.commonModelProductAttribute.updateById(
						transaction,
						restPayload,
						productAttributeId,
						userId
					)

					// get updated details
					const [productAttribute] =
						await this.commonModelProductAttribute.list(transaction, {
							filter: {
								productAttributeId
							}
						})

					return [productAttribute]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: productAttribute
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {productAttributeIds} = req.body

			if (!productAttributeIds?.length) {
				throw new BadRequestException(
					`Please select product attribute(s) to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingProductAttributes =
						await this.commonModelProductAttribute.list(transaction, {
							filter: {
								productAttributeId: productAttributeIds
							}
						})
					if (!existingProductAttributes.length) {
						const productAttributeIdsSet: Set<number> = new Set(
							existingProductAttributes.map((obj) => obj.productAttributeId)
						)
						throw new BadRequestException(
							`Selected Product attribute(s) not found: ${productAttributeIds.filter((productAttributeId) => !productAttributeIdsSet.has(productAttributeId))}`
						)
					}

					await this.commonModelProductAttribute.softDeleteByIds(
						transaction,
						productAttributeIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Product attribute(s) deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new ProductAttributeController()
