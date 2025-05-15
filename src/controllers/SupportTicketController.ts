import {NextFunction, Request, Response} from "express"

import {createFullName, listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class SupportTicketController {
	private commonModelSupportTicket
	private commonModelSupportTicketMedia
	private commonModelUser

	private idColumnSupportTicket: string = "supportTicketId"
	private idColumnSupportTicketMedia: string = "supportTicketMediaId"
	private idColumnUser: string = "userId"

	constructor() {
		this.commonModelSupportTicket = new CommonModel(
			"SupportTicket",
			this.idColumnSupportTicket,
			["subject", "description"]
		)
		this.commonModelSupportTicketMedia = new CommonModel(
			"SupportTicketMedia",
			this.idColumnSupportTicketMedia,
			[]
		)

		this.commonModelUser = new CommonModel(
			"User",
			this.idColumnSupportTicket,
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

			const [supportTickets, total, stats] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [supportTickets, total, allSupportTickets] = await Promise.all([
						this.commonModelSupportTicket.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelSupportTicket.list(transaction, {
							filter,
							isCountOnly: true
						}),
						this.commonModelSupportTicket.list(transaction, {
							filter,
							range: {
								all: true
							},
							sort
						})
					])

					const createdByIds: number[] = supportTickets.map(
						({createdById}) => createdById
					)
					const supportTicketIds: number[] = supportTickets.map(
						(supportTicket) => supportTicket.supportTicketId
					)

					const users = await this.commonModelUser.list(transaction, {
						filter: {
							userId: createdByIds
						},
						range: {
							all: true
						}
					})

					const supportTicketMediaData =
						await this.commonModelSupportTicketMedia.list(transaction, {
							filter: {
								supportTicketId: supportTicketIds
							},
							range: {
								all: true
							}
						})

					const userToUserIdMap = new Map(
						users.map((user) => [user.userId, user])
					)

					const supportTicketMediaBySupportTicket = (
						supportTicketId: number
					) => {
						return supportTicketMediaData.filter(
							(supportTicketMedia) =>
								supportTicketId === supportTicketMedia.supportTicketId
						)
					}

					supportTickets = supportTickets.map((supportTicket) => {
						let createdByUser: any = userToUserIdMap.get(
							supportTicket.createdById
						)

						createdByUser = {
							...createdByUser,
							fullName: createFullName(createdByUser)
						}

						return {
							...supportTicket,
							createdByUser,
							supportTicketMedias: supportTicketMediaBySupportTicket(
								supportTicket.supportTicketId
							)
						}
					})

					const stats = {
						totalTickets: 0,
						openTickets: 0,
						pendingTickets: 0,
						closedTickets: 0
					}

					allSupportTickets.map(({ticketStatus}) => {
						switch (ticketStatus) {
							case "open":
								stats.totalTickets++
								stats.openTickets++

								break

							case "pending":
								stats.totalTickets++
								stats.pendingTickets++

								break

							case "closed":
								stats.totalTickets++
								stats.closedTickets++

								break
						}
					})

					return [supportTickets, total, stats]
				}
			)

			return response.successResponse({
				message: `support ticket(s) data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				stats,
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
