import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class AttributeController {
	private commonModelAttribute

	private idColumnAttribute: string = "attributeId"

	constructor() {
		this.commonModelAttribute = new CommonModel(
			"Attribute",
			this.idColumnAttribute,
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

			const [attributes] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const attributes = await this.commonModelAttribute.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [attributes]
				}
			)

			return response.successResponse({
				message: `Attribute(s) created successfully`,
				data: attributes
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

			const [attributes, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelAttribute.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelAttribute.list(transaction, {
							filter,
							isCountOnly: true
						})
					])
				}
			)

			return response.successResponse({
				message: `Attribute(s) data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: attributes
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {attributeId, ...restPayload} = req.body

			const [attribute] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingAttribute] = await this.commonModelAttribute.list(
						transaction,
						{
							filter: {
								attributeId
							}
						}
					)
					if (!existingAttribute) {
						throw new BadRequestException("Attribute doesn't exist")
					}

					// update
					await this.commonModelAttribute.updateById(
						transaction,
						restPayload,
						attributeId,
						userId
					)

					// get updated details
					const [attribute] = await this.commonModelAttribute.list(
						transaction,
						{
							filter: {
								attributeId
							}
						}
					)

					return [attribute]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: attribute
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {attributeIds} = req.body

			if (!attributeIds?.length) {
				throw new BadRequestException(
					`Please select attribute(s) to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingAttributes = await this.commonModelAttribute.list(
						transaction,
						{
							filter: {
								attributeId: attributeIds
							}
						}
					)
					if (!existingAttributes.length) {
						const attributeIdsSet: Set<number> = new Set(
							existingAttributes.map((obj) => obj.userId)
						)
						throw new BadRequestException(
							`Selected Attribute(s) not found: ${attributeIds.filter((attributeId) => !attributeIdsSet.has(attributeId))}`
						)
					}

					await this.commonModelAttribute.softDeleteByIds(
						transaction,
						attributeIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Attribute(s) deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new AttributeController()
