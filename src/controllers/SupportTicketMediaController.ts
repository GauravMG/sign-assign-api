import {NextFunction, Request, Response} from "express"

import {createFullName, listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class SupportTicketMediaController {
	private commonModelSupportTicket
	private commonModelUser
	private commonModelSupportTicketMedia

	private idColumnSupportTicket: string = "supportTicketId"
	private idColumnUserId: string = "userId"
	private idColumnSupportTicketMedia: string = "supportTicketMediaId"

	constructor() {
		;(this.commonModelSupportTicketMedia = new CommonModel(
			"SupportTicketMedia",
			this.idColumnSupportTicketMedia,
			["mediaType", "name"]
		)),
			(this.commonModelSupportTicket = new CommonModel(
				"SupportTicket",
				this.idColumnSupportTicket,
				[]
			))
		this.commonModelUser = new CommonModel("User", this.idColumnUserId, [
			"firstName",
			"lastName"
		])

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

			const [supportTicketMedias] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const supportTicketMedias =
						await this.commonModelSupportTicketMedia.bulkCreate(
							transaction,
							payload,
							userId
						)

					return [supportTicketMedias]
				}
			)

			return response.successResponse({
				message: `Support ticket media created successfully`,
				data: supportTicketMedias
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

			const [supportTicketMedias, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelSupportTicketMedia.list(transaction, {
							filter,
							range,
							sort
						}),
						this.commonModelSupportTicketMedia.list(transaction, {
							filter,
							isCountOnly: true
						}),
						this.commonModelSupportTicket.list(transaction, {})
					])
				}
			)
			return response.successResponse({
				message: `Support ticket media data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: supportTicketMedias?.length ? supportTicketMedias : []
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			let {supportTicketMediaId, ...restPayload} = req.body

			const [supportTicketMedia] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingSupportTicketMedia] =
						await this.commonModelSupportTicketMedia.list(transaction, {
							filter: {
								supportTicketMediaId
							}
						})
					if (!existingSupportTicketMedia) {
						throw new BadRequestException("Support ticket media doesn't exist")
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
					await this.commonModelSupportTicketMedia.updateById(
						transaction,
						restPayload,
						supportTicketMediaId,
						userId
					)

					// get updated details
					const [supportTicketMedia] =
						await this.commonModelSupportTicketMedia.list(transaction, {
							filter: {
								supportTicketMediaId
							}
						})

					return [supportTicketMedia]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: supportTicketMedia
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {supportTicketMediaIds} = req.body

			if (!supportTicketMediaIds?.length) {
				throw new BadRequestException(
					`Please select support tickets to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingSupportTicketMedia =
						await this.commonModelSupportTicketMedia.list(transaction, {
							filter: {
								supportTicketMediaId: supportTicketMediaIds
							}
						})
					if (!existingSupportTicketMedia.length) {
						const supportTicketMediaIdsSet: Set<number> = new Set(
							existingSupportTicketMedia.map((obj) => obj.supportTicketMediaId)
						)
						throw new BadRequestException(
							`Selected support tickets not found: ${supportTicketMediaIds.filter((supportTicketMediaId) => !supportTicketMediaIdsSet.has(supportTicketMediaId))}`
						)
					}

					await this.commonModelSupportTicketMedia.softDeleteByIds(
						transaction,
						supportTicketMediaIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Support tickets media deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new SupportTicketMediaController()
