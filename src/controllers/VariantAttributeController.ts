import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class VariantAttributeController {
	private commonModelVariantAttribute
	private commonModelAttribute

	private idColumnProductAttribute: string = "variantAttributeId"
	private idColumnAttribute: string = "attributeId"

	constructor() {
		this.commonModelVariantAttribute = new CommonModel(
			"VariantAttribute",
			this.idColumnProductAttribute,
			[]
		)
		this.commonModelAttribute = new CommonModel(
			"Attribute",
			this.idColumnAttribute,
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

			const [variantAttributes] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const variantAttributes =
						await this.commonModelVariantAttribute.bulkCreate(
							transaction,
							payload,
							userId
						)

					return [variantAttributes]
				}
			)

			return response.successResponse({
				message: `Variant attribute(s) created successfully`,
				data: variantAttributes
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

			let [variantAttributes, total, attributes] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelVariantAttribute.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelVariantAttribute.list(transaction, {
							filter,
							isCountOnly: true
						}),

						this.commonModelAttribute.list(transaction, {
							filter: {}
						})
					])
				}
			)

			const getAttributeById = (id: number) =>
				attributes.find((attribute) => id === attribute.attributeId)

			variantAttributes = variantAttributes.map((el) => {
				return {
					...el,
					attribute: getAttributeById(el.attributeId)
				}
			})

			return response.successResponse({
				message: `Variant attribute(s) data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: variantAttributes
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {variantAttributeId, ...restPayload} = req.body

			const [variantAttribute] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingVariantAttribute] =
						await this.commonModelVariantAttribute.list(transaction, {
							filter: {
								variantAttributeId
							}
						})
					if (!existingVariantAttribute) {
						throw new BadRequestException("Variant attribute doesn't exist")
					}

					// update
					await this.commonModelVariantAttribute.updateById(
						transaction,
						restPayload,
						variantAttributeId,
						userId
					)

					// get updated details
					const [variantAttribute] =
						await this.commonModelVariantAttribute.list(transaction, {
							filter: {
								variantAttributeId
							}
						})

					return [variantAttribute]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: variantAttribute
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {variantAttributeIds} = req.body

			if (!variantAttributeIds?.length) {
				throw new BadRequestException(
					`Please select variant attribute(s) to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingVariantAttributes =
						await this.commonModelVariantAttribute.list(transaction, {
							filter: {
								variantAttributeId: variantAttributeIds
							}
						})
					if (!existingVariantAttributes.length) {
						const productAttributeIdsSet: Set<number> = new Set(
							existingVariantAttributes.map((obj) => obj.variantAttributeId)
						)
						throw new BadRequestException(
							`Selected Variant attribute(s) not found: ${variantAttributeIds.filter((variantAttributeId) => !productAttributeIdsSet.has(variantAttributeId))}`
						)
					}

					await this.commonModelVariantAttribute.softDeleteByIds(
						transaction,
						variantAttributeIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Variant attribute(s) deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new VariantAttributeController()
