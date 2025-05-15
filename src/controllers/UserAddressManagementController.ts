import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class UserAddressManagementController {
	private commonModelUserAddressManagement

	private idColumnUserAddressManagement: string = "userAddressManagementId"

	constructor() {
		this.commonModelUserAddressManagement = new CommonModel(
			"UserAddressManagement",
			this.idColumnUserAddressManagement,
			[
				"firstName",
				"lastName",
				"companyName",
				"phoneNumber",
				"streetAddress",
				"postal",
				"city",
				"state",
				"country"
			]
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

			const [userAddressManagements] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const userAddressManagements =
						await this.commonModelUserAddressManagement.bulkCreate(
							transaction,
							payload,
							userId
						)

					return [userAddressManagements]
				}
			)

			return response.successResponse({
				message: `User address management(s) created successfully`,
				data: userAddressManagements
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

			const [userAddressManagements, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelUserAddressManagement.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelUserAddressManagement.list(transaction, {
							filter,
							isCountOnly: true
						})
					])
				}
			)

			return response.successResponse({
				message: `User address management(s) data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: userAddressManagements
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {userAddressManagementId, ...restPayload} = req.body

			const [userAddressManagement] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingUserAddressManagement] =
						await this.commonModelUserAddressManagement.list(transaction, {
							filter: {
								userAddressManagementId
							}
						})
					if (!existingUserAddressManagement) {
						throw new BadRequestException(
							"User address management doesn't exist"
						)
					}

					// update
					await this.commonModelUserAddressManagement.updateById(
						transaction,
						restPayload,
						userAddressManagementId,
						userId
					)

					// get updated details
					const [userAddressManagement] =
						await this.commonModelUserAddressManagement.list(transaction, {
							filter: {
								userAddressManagementId
							}
						})

					return [userAddressManagement]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: userAddressManagement
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {userAddressManagementIds} = req.body

			if (!userAddressManagementIds?.length) {
				throw new BadRequestException(
					`Please select user address management(s) to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingUserAddressManagements =
						await this.commonModelUserAddressManagement.list(transaction, {
							filter: {
								userAddressManagementId: userAddressManagementIds
							}
						})
					if (!existingUserAddressManagements.length) {
						const userAddressManagementIdsSet: Set<number> = new Set(
							existingUserAddressManagements.map((obj) => obj.userId)
						)
						throw new BadRequestException(
							`Selected user address management(s) not found: ${userAddressManagementIds.filter((userAddressManagementId) => !userAddressManagementIdsSet.has(userAddressManagementId))}`
						)
					}

					await this.commonModelUserAddressManagement.softDeleteByIds(
						transaction,
						userAddressManagementIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `User address management(s) deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new UserAddressManagementController()
