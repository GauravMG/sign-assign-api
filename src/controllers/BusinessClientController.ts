import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"
import {Role} from "../types/auth"

class BusinessClientController {
	private commonModelBusinessClient

	private idColumnBusinessClient: string = "businessClientId"

	constructor() {
		this.commonModelBusinessClient = new CommonModel(
			"BusinessClient",
			this.idColumnBusinessClient,
			["firstName", "lastName", "mobile", "email"]
		)

		this.create = this.create.bind(this)
		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
		this.delete = this.delete.bind(this)
	}

	public async create(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId, businessId}: Headers = req.headers

			if (
				![Role.SUPER_ADMIN, Role.BUSINESS_ADMIN, Role.BUSINESS_STAFF].includes(
					roleId
				)
			) {
				throw new BadRequestException(
					"You are not authorized to access clients data!"
				)
			}

			let payload = Array.isArray(req.body) ? req.body : [req.body]

			const [businessClient] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const businessClient =
						await this.commonModelBusinessClient.bulkCreate(
							transaction,
							payload.map((el) => ({
								...el,
								businessId: Number(businessId)
							})),
							userId
						)

					return [businessClient]
				}
			)

			return response.successResponse({
				message: `Business client created successfully`,
				data: businessClient
			})
		} catch (error) {
			next(error)
		}
	}

	public async list(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {roleId, businessId}: Headers = req.headers

			if (
				![Role.SUPER_ADMIN, Role.BUSINESS_ADMIN, Role.BUSINESS_STAFF].includes(
					roleId
				)
			) {
				throw new BadRequestException(
					"You are not authorized to access clients data!"
				)
			}

			let mandatoryFilters: any = {}
			if ([Role.BUSINESS_ADMIN, Role.BUSINESS_STAFF].includes(roleId)) {
				mandatoryFilters = {
					...mandatoryFilters,
					businessId
				}
			}

			const {filter, range, sort} = await listAPIPayload(req.body)

			const [businessClients, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [businessClients, total] = await Promise.all([
						this.commonModelBusinessClient.list(transaction, {
							filter: {
								...filter,
								...mandatoryFilters
							},
							range,
							sort
						}),

						this.commonModelBusinessClient.list(transaction, {
							filter: {
								...filter,
								...mandatoryFilters
							},
							isCountOnly: true
						})
					])

					return [businessClients, total]
				}
			)

			return response.successResponse({
				message: `Business client data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: businessClients
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			if (
				![Role.SUPER_ADMIN, Role.BUSINESS_ADMIN, Role.BUSINESS_STAFF].includes(
					roleId
				)
			) {
				throw new BadRequestException(
					"You are not authorized to access clients data!"
				)
			}

			const {businessClientId, ...restPayload} = req.body

			const [businessClient] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingBusinessClient] =
						await this.commonModelBusinessClient.list(transaction, {
							filter: {
								businessClientId
							}
						})
					if (!existingBusinessClient) {
						throw new BadRequestException("Business client doesn't exist")
					}

					// update
					await this.commonModelBusinessClient.updateById(
						transaction,
						restPayload,
						businessClientId,
						userId
					)

					// get updated details
					const [businessClient] = await this.commonModelBusinessClient.list(
						transaction,
						{
							filter: {
								businessClientId
							}
						}
					)

					return [businessClient]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: businessClient
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			if (
				![Role.SUPER_ADMIN, Role.BUSINESS_ADMIN, Role.BUSINESS_STAFF].includes(
					roleId
				)
			) {
				throw new BadRequestException(
					"You are not authorized to access clients data!"
				)
			}

			const {businessClientIds} = req.body

			if (!businessClientIds?.length) {
				throw new BadRequestException(
					`Please select business client to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingBusinessClients =
						await this.commonModelBusinessClient.list(transaction, {
							filter: {
								businessClientId: businessClientIds
							}
						})
					if (!existingBusinessClients.length) {
						const businessClientIdsSet: Set<number> = new Set(
							existingBusinessClients.map((obj) => obj.businessClientId)
						)
						throw new BadRequestException(
							`Selected business client not found: ${businessClientIds.filter((businessClientId) => !businessClientIdsSet.has(businessClientId))}`
						)
					}

					await this.commonModelBusinessClient.softDeleteByIds(
						transaction,
						businessClientIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Business client deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new BusinessClientController()
