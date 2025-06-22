import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class TemplateTagController {
	private commonModelTemplateTag

	private idColumnTemplateTag: string = "templateTagId"

	constructor() {
		this.commonModelTemplateTag = new CommonModel(
			"TemplateTag",
			this.idColumnTemplateTag,
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

			const [templateTags] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const templateTags = await this.commonModelTemplateTag.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [templateTags]
				}
			)

			return response.successResponse({
				message: `Template tag created successfully`,
				data: templateTags
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

			const [templateTags, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelTemplateTag.list(transaction, {
							filter,
							range,
							sort
						}),
						this.commonModelTemplateTag.list(transaction, {
							filter,
							isCountOnly: true
						})
					])
				}
			)

			return response.successResponse({
				message: `Template tag data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: templateTags
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			let {templateTagId, ...restPayload} = req.body

			const [templateTag] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingTemplateTag] = await this.commonModelTemplateTag.list(
						transaction,
						{
							filter: {
								templateTagId
							}
						}
					)
					if (!existingTemplateTag) {
						throw new BadRequestException("Template tag doesn't exist")
					}

					// for size as we are taking size as in kb so taking it as string
					restPayload = {
						...restPayload,
						size:
							typeof restPayload.size === "number"
								? String(restPayload.size)
								: restPayload.size
					}

					// update
					await this.commonModelTemplateTag.updateById(
						transaction,
						restPayload,
						templateTagId,
						userId
					)

					// get updated details
					const [templateTag] = await this.commonModelTemplateTag.list(
						transaction,
						{
							filter: {
								templateTagId
							}
						}
					)

					return [templateTag]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: templateTag
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {templateTagIds} = req.body

			if (!templateTagIds?.length) {
				throw new BadRequestException(
					`Please select template tag to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingTemplateTag = await this.commonModelTemplateTag.list(
						transaction,
						{
							filter: {
								templateTagId: templateTagIds
							}
						}
					)
					if (!existingTemplateTag.length) {
						const templateTagIdsSet: Set<number> = new Set(
							existingTemplateTag.map((obj) => obj.templateTagId)
						)
						throw new BadRequestException(
							`Selected template tags not found: ${templateTagIds.filter((templateTagId) => !templateTagIdsSet.has(templateTagId))}`
						)
					}

					await this.commonModelTemplateTag.softDeleteByIds(
						transaction,
						templateTagIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Template tags deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new TemplateTagController()
