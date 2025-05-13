import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class SupportTicketController {
	private commonModelSupportTicket

	private idColumnSupportTicket: string = "supportTicketId"

	constructor() {
		this.commonModelSupportTicket = new CommonModel(
			"SupportTicket",
			this.idColumnSupportTicket,
			["subject"]
		)

		this.create = this.create.bind(this)
		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
		this.delete = this.delete.bind(this)
	}

	public async create(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId}: Headers = req.headers

			let payload = Array.isArray(req.body) ? req.body : [req.body]

			const [supportTickets] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const supportTickets = await this.commonModelSupportTicket.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [supportTickets]
				}
			)

			return response.successResponse({
				message: `Support ticket(s) created successfully`,
				data: supportTickets
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

			const [supportTickets, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelSupportTicket.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelSupportTicket.list(transaction, {
							filter,
							isCountOnly: true
						})
					])
				}
			)

			return response.successResponse({
				message: `support ticket(s) data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: supportTickets
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {supportTicketId, ...restPayload} = req.body

			const [supportTicket] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingSupportTicket] =
						await this.commonModelSupportTicket.list(transaction, {
							filter: {
								supportTicketId
							}
						})
					if (!existingSupportTicket) {
						throw new BadRequestException("Support ticket doesn't exist")
					}

					// update
					await this.commonModelSupportTicket.updateById(
						transaction,
						restPayload,
						supportTicketId,
						userId
					)

					// get updated details
					const [supportTicket] = await this.commonModelSupportTicket.list(
						transaction,
						{
							filter: {
								supportTicketId
							}
						}
					)

					return [supportTicket]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: supportTicket
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {supportTicketIds} = req.body

			if (!supportTicketIds?.length) {
				throw new BadRequestException(
					`Please select support ticket(s) to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingProductCategories =
						await this.commonModelSupportTicket.list(transaction, {
							filter: {
								supportTicketId: supportTicketIds
							}
						})
					if (!existingProductCategories.length) {
						const supportTicketIdsSet: Set<number> = new Set(
							existingProductCategories.map((obj) => obj.userId)
						)
						throw new BadRequestException(
							`Selected support ticket(s) not found: ${supportTicketIds.filter((supportTicketId) => !supportTicketIdsSet.has(supportTicketId))}`
						)
					}

					await this.commonModelSupportTicket.softDeleteByIds(
						transaction,
						supportTicketIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `support ticket(s) deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new SupportTicketController()
