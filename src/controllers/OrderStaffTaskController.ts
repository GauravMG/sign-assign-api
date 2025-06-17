import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"
import {isWebUser} from "../types/auth"

class OrderStaffTaskController {
	private commonModelOrderStaffTask
	private commonModelOrderStaffMapping
	private commonModelUser

	private idColumnOrderStaffTask: string = "orderStaffTaskId"
	private idColumnOrderStaffMapping: string = "orderStaffMappingId"
	private idColumnUser: string = "userId"

	constructor() {
		this.commonModelOrderStaffTask = new CommonModel(
			"OrderStaffTask",
			this.idColumnOrderStaffTask,
			["task"]
		)
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

			const [orderStaffTasks] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const orderStaffTasks =
						await this.commonModelOrderStaffTask.bulkCreate(
							transaction,
							payload,
							userId
						)

					return [orderStaffTasks]
				}
			)

			return response.successResponse({
				message: `Order staff tasks created successfully`,
				data: orderStaffTasks
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

			const [orderStaffTasks, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [orderStaffTasks, total] = await Promise.all([
						this.commonModelOrderStaffTask.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							range,
							sort
						}),

						this.commonModelOrderStaffTask.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							isCountOnly: true
						})
					])

					const orderStaffMappingIds: number[] = orderStaffTasks.map(
						(orderStaffTask) => orderStaffTask.orderStaffMappingId
					)

					let orderStaffMappings = await this.commonModelOrderStaffMapping.list(
						transaction,
						{
							filter: {
								orderStaffMappingId: orderStaffMappingIds
							},
							range,
							sort
						}
					)

					const userIds: number[] = orderStaffMappings.map(
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

					const orderStaffMappingMap: any = new Map(
						orderStaffMappings.map((orderStaffMapping) => [
							orderStaffMapping.orderStaffMappingId,
							orderStaffMapping
						])
					)

					orderStaffTasks = orderStaffTasks.map((orderStaffTask) => ({
						...orderStaffTask,
						orderStaffMapping: orderStaffMappingMap.get(
							orderStaffTask.orderStaffMappingId
						)
					}))

					return [orderStaffTasks, total]
				}
			)

			return response.successResponse({
				message: `Order staff tasks data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: orderStaffTasks
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {orderStaffTaskId, ...restPayload} = req.body

			const [orderStaffTask] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingOrderStaffTask] =
						await this.commonModelOrderStaffTask.list(transaction, {
							filter: {
								orderStaffTaskId
							}
						})
					if (!existingOrderStaffTask) {
						throw new BadRequestException("Order staff task doesn't exist")
					}

					// update
					await this.commonModelOrderStaffTask.updateById(
						transaction,
						restPayload,
						orderStaffTaskId,
						userId
					)

					// get updated details
					const [orderStaffTask] = await this.commonModelOrderStaffTask.list(
						transaction,
						{
							filter: {
								orderStaffTaskId
							}
						}
					)

					return [orderStaffTask]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: orderStaffTask
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {orderStaffTaskIds} = req.body

			if (!orderStaffTaskIds?.length) {
				throw new BadRequestException(
					`Please select order staff tasks to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingProductSubCategories =
						await this.commonModelOrderStaffTask.list(transaction, {
							filter: {
								orderStaffTaskId: orderStaffTaskIds
							}
						})
					if (!existingProductSubCategories.length) {
						const orderStaffTaskIdsSet: Set<number> = new Set(
							existingProductSubCategories.map((obj) => obj.orderStaffTaskId)
						)
						throw new BadRequestException(
							`Selected order staff tasks not found: ${orderStaffTaskIds.filter((orderStaffTaskId) => !orderStaffTaskIdsSet.has(orderStaffTaskId))}`
						)
					}

					await this.commonModelOrderStaffTask.softDeleteByIds(
						transaction,
						orderStaffTaskIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Order staff tasks deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new OrderStaffTaskController()
