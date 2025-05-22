import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class UserAddressController {
	private commonModelUserAddress

	private idColumnUserAddress: string = "userAddressId"

	constructor() {
		this.commonModelUserAddress = new CommonModel(
			"UserAddress",
			this.idColumnUserAddress,
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

			const [userAddresss] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const userAddresss = await this.commonModelUserAddress.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [userAddresss]
				}
			)

			return response.successResponse({
				message: `User address(es) created successfully`,
				data: userAddresss
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

			const [userAddresss, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelUserAddress.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelUserAddress.list(transaction, {
							filter,
							isCountOnly: true
						})
					])
				}
			)

			return response.successResponse({
				message: `User address(es) data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: userAddresss
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {userAddressId, ...restPayload} = req.body

			const [userAddress] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingUserAddress] = await this.commonModelUserAddress.list(
						transaction,
						{
							filter: {
								userAddressId
							}
						}
					)
					if (!existingUserAddress) {
						throw new BadRequestException("User address  doesn't exist")
					}

					// update
					await this.commonModelUserAddress.updateById(
						transaction,
						restPayload,
						userAddressId,
						userId
					)

					// get updated details
					const [userAddress] = await this.commonModelUserAddress.list(
						transaction,
						{
							filter: {
								userAddressId
							}
						}
					)

					return [userAddress]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: userAddress
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {userAddressIds} = req.body

			if (!userAddressIds?.length) {
				throw new BadRequestException(
					`Please select user address (s) to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingUserAddresss = await this.commonModelUserAddress.list(
						transaction,
						{
							filter: {
								userAddressId: userAddressIds
							}
						}
					)
					if (!existingUserAddresss.length) {
						const userAddressIdsSet: Set<number> = new Set(
							existingUserAddresss.map((obj) => obj.userId)
						)
						throw new BadRequestException(
							`Selected user address(es) not found: ${userAddressIds.filter((userAddressId) => !userAddressIdsSet.has(userAddressId))}`
						)
					}

					await this.commonModelUserAddress.softDeleteByIds(
						transaction,
						userAddressIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `User address(es) deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new UserAddressController()
