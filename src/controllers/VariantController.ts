import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"
import {isWebUser} from "../types/auth"

class VariantController {
	private commonModelVariant
	private commonModelVariantMedia
	private commonModelVariantAttribute
	private commonModelAttribute

	private idColumnVariant: string = "variantId"
	private idColumnVariantMedia: string = "variantMediaId"
	private idColumnProductAttribute: string = "variantAttributeId"
	private idColumnAttribute: string = "attributeId"

	constructor() {
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

			const [variant] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const variant = await this.commonModelVariant.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [variant]
				}
			)

			return response.successResponse({
				message: `Variant created successfully`,
				data: variant
			})
		} catch (error) {
			next(error)
		}
	}

	public async list(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {roleId}: Headers = req.headers

			let mandatoryFilters: any = {}
			if (isWebUser(roleId)) {
				mandatoryFilters = {
					...mandatoryFilters,
					status: true
				}
			}

			const {filter, range, sort, linkedEntities} = await listAPIPayload(
				req.body
			)

			const [variants, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [variants, total] = await Promise.all([
						this.commonModelVariant.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							range,
							sort
						}),

						this.commonModelVariant.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							isCountOnly: true
						})
					])

					if (linkedEntities) {
						const variantIds: number[] = []

						for (let i = 0; i < variants?.length; i++) {
							variantIds.push(variants[i].variantId)
						}

						let [variantMedias, variantAttributes] = await Promise.all([
							this.commonModelVariantMedia.list(transaction, {
								filter: {
									...mandatoryFilters,
									variantId: variantIds
								},
								range: {
									all: true
								}
							}),

							this.commonModelVariantAttribute.list(transaction, {
								filter: {
									...mandatoryFilters,
									variantId: variantIds
								},
								range: {
									all: true
								}
							})
						])

						const attributeIds: number[] = variantAttributes.map(
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

						const attributeMap = new Map<number, any>()
						for (const attribute of attributes) {
							attributeMap.set(attribute.attributeId, attribute)
						}

						variantAttributes = variantAttributes.map((variantAttribute) => ({
							...variantAttribute,
							attribute: attributeMap.get(variantAttribute.attributeId) || null
						}))

						const variantMediaMap = new Map<number, any[]>()
						for (const variantMedia of variantMedias) {
							const variantMediaGroup =
								variantMediaMap.get(variantMedia.variantId) || []
							variantMediaGroup.push(variantMedia)
							variantMediaMap.set(variantMedia.variantId, variantMediaGroup)
						}

						const variantAttributeMap = new Map<number, any[]>()
						for (const variantAttribute of variantAttributes) {
							const variantAttributeGroup =
								variantAttributeMap.get(variantAttribute.variantId) || []
							variantAttributeGroup.push(variantAttribute)
							variantAttributeMap.set(
								variantAttribute.variantId,
								variantAttributeGroup
							)
						}

						variants = variants.map((variant) => ({
							...variant,
							variantMedias: variantMediaMap.get(variant.variantId) || [],
							variantAttributes:
								variantAttributeMap.get(variant.variantId) || []
						}))
					}

					return [variants, total]
				}
			)

			return response.successResponse({
				message: `Variant data`,
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
				throw new BadRequestException(`Please select variant to be deleted`)
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
						const productIdsSet: Set<number> = new Set(
							existingVariants.map((obj) => obj.variantId)
						)
						throw new BadRequestException(
							`Selected variant not found: ${variantIds.filter((variantId) => !productIdsSet.has(variantId))}`
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
				message: `Variant deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new VariantController()
