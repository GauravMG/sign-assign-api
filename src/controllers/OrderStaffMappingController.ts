import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"
import {isWebUser} from "../types/auth"

class OrderStaffMappingController {
	private commonModelOrderStaffMapping
	private commonModelUser

	private idColumnOrderStaffMapping: string = "orderStaffMappingId"
	private idColumnUser: string = "userId"

	constructor() {
		this.commonModelOrderStaffMapping = new CommonModel(
			"OrderStaffMapping",
			this.idColumnOrderStaffMapping,
			[]
		)
		this.commonModelUser = new CommonModel("User", this.idColumnUser, [
			"firstName",
			"lastName",
			"email",
			"mobile"
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

			const [orderStaffMappings] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const orderStaffMappings =
						await this.commonModelOrderStaffMapping.bulkCreate(
							transaction,
							payload,
							userId
						)

					return [orderStaffMappings]
				}
			)

			return response.successResponse({
				message: `Order staff mappings created successfully`,
				data: orderStaffMappings
			})
		} catch (error) {
			next(error)
		}
	}

	public async list(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			let mandatoryFilters: any = {}
			if (isWebUser(roleId)) {
				mandatoryFilters = {
					...mandatoryFilters,
					status: true
				}
			}

			const {filter, range, sort} = await listAPIPayload(req.body)

			const [orderStaffMappings, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [orderStaffMappings, total] = await Promise.all([
						this.commonModelOrderStaffMapping.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							range,
							sort
						}),

						this.commonModelOrderStaffMapping.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							isCountOnly: true
						})
					])

					let userIds: number[] = orderStaffMappings.map(
						(orderStaffMapping) => orderStaffMapping.userId
					)

					const users = await this.commonModelUser.list(transaction, {
						filter: {
							userId: userIds
						},
						range: {
							all: true
						}
					})

					const userMap: any = new Map(users.map((user) => [user.userId, user]))

					orderStaffMappings = orderStaffMappings.map((orderStaffMapping) => ({
						...orderStaffMapping,
						user: userMap.get(orderStaffMapping.userId)
					}))

					return [orderStaffMappings, total]
				}
			)

			return response.successResponse({
				message: `Order staff mappings data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: orderStaffMappings
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {orderStaffMappingId, ...restPayload} = req.body

			const [orderStaffMapping] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingOrderStaffMapping] =
						await this.commonModelOrderStaffMapping.list(transaction, {
							filter: {
								orderStaffMappingId
							}
						})
					if (!existingOrderStaffMapping) {
						throw new BadRequestException("Order staff mapping doesn't exist")
					}

					// update
					await this.commonModelOrderStaffMapping.updateById(
						transaction,
						restPayload,
						orderStaffMappingId,
						userId
					)

					// get updated details
					const [orderStaffMapping] =
						await this.commonModelOrderStaffMapping.list(transaction, {
							filter: {
								orderStaffMappingId
							}
						})

					return [orderStaffMapping]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: orderStaffMapping
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {orderStaffMappingIds} = req.body

			if (!orderStaffMappingIds?.length) {
				throw new BadRequestException(
					`Please select order staff mappings to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingProductSubCategories =
						await this.commonModelOrderStaffMapping.list(transaction, {
							filter: {
								orderStaffMappingId: orderStaffMappingIds
							}
						})
					if (!existingProductSubCategories.length) {
						const orderStaffMappingIdsSet: Set<number> = new Set(
							existingProductSubCategories.map((obj) => obj.orderStaffMappingId)
						)
						throw new BadRequestException(
							`Selected order staff mappings not found: ${orderStaffMappingIds.filter((orderStaffMappingId) => !orderStaffMappingIdsSet.has(orderStaffMappingId))}`
						)
					}

					await this.commonModelOrderStaffMapping.softDeleteByIds(
						transaction,
						orderStaffMappingIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Order staff mappings deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new OrderStaffMappingController()
