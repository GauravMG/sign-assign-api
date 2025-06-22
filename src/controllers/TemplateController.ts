import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"
import {isWebUser} from "../types/auth"

class TemplateController {
	private commonModelTemplate
	private commonModelTemplateTag

	private idColumnTemplate: string = "templateId"
	private idColumnTemplateTag: string = "templateTagId"

	constructor() {
		this.commonModelTemplate = new CommonModel(
			"Template",
			this.idColumnTemplate,
			["name"]
		)
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

			const [template] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const template = await this.commonModelTemplate.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [template]
				}
			)

			return response.successResponse({
				message: `Template created successfully`,
				data: template
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

			const [templates, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [templates, total] = await Promise.all([
						this.commonModelTemplate.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							range,
							sort
						}),

						this.commonModelTemplate.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							isCountOnly: true
						})
					])

					if (linkedEntities) {
						const templateIds: number[] = []

						for (let i = 0; i < templates?.length; i++) {
							templateIds.push(templates[i].templateId)
						}

						let templateTags = await this.commonModelTemplateTag.list(
							transaction,
							{
								filter: {
									...mandatoryFilters,
									templateId: templateIds
								},
								range: {
									all: true
								}
							}
						)

						const templateTagMap = new Map<number, any[]>()
						for (const templateTag of templateTags) {
							const templateTagGroup =
								templateTagMap.get(templateTag.templateId) || []
							templateTagGroup.push(templateTag)
							templateTagMap.set(templateTag.templateId, templateTagGroup)
						}

						templates = templates.map((template) => ({
							...template,
							templateTags: templateTagMap.get(template.templateId) || []
						}))
					}

					return [templates, total]
				}
			)

			return response.successResponse({
				message: `Template data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: templates
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {templateId, ...restPayload} = req.body

			const [template] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingTemplate] = await this.commonModelTemplate.list(
						transaction,
						{
							filter: {
								templateId
							}
						}
					)
					if (!existingTemplate) {
						throw new BadRequestException("Template doesn't exist")
					}

					// update
					await this.commonModelTemplate.updateById(
						transaction,
						restPayload,
						templateId,
						userId
					)

					// get updated details
					const [template] = await this.commonModelTemplate.list(transaction, {
						filter: {
							templateId
						}
					})

					return [template]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: template
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {templateIds} = req.body

			if (!templateIds?.length) {
				throw new BadRequestException(`Please select template to be deleted`)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingTemplates = await this.commonModelTemplate.list(
						transaction,
						{
							filter: {
								templateId: templateIds
							}
						}
					)
					if (!existingTemplates.length) {
						const templateIdsSet: Set<number> = new Set(
							existingTemplates.map((obj) => obj.templateId)
						)
						throw new BadRequestException(
							`Selected template not found: ${templateIds.filter((templateId) => !templateIdsSet.has(templateId))}`
						)
					}

					await this.commonModelTemplate.softDeleteByIds(
						transaction,
						templateIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Template deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new TemplateController()
