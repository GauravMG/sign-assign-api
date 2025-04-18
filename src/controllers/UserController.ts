import bcrypt from "bcrypt"
import {NextFunction, Request, Response} from "express"

import {createFullName, listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {Role} from "../types/auth"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class UserController {
	private commonModelUser
	private commonModelBusinessUserMapping

	private idColumnUser: string = "userId"
	private idColumnBusinessUserMapping: string = "businessUserMappingId"

	constructor() {
		this.commonModelUser = new CommonModel("User", this.idColumnUser, [
			"roleId",
			"fullName",
			"mobile"
		])
		this.commonModelBusinessUserMapping = new CommonModel(
			"BusinessUserMapping",
			this.idColumnBusinessUserMapping,
			[]
		)

		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
		this.delete = this.delete.bind(this)
	}

	public async list(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {filter, range, sort} = await listAPIPayload(req.body)

			const [data, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					if (
						!filter.userId &&
						filter.roleId !== Role.BUSINESS_STAFF &&
						[Role.SUPER_ADMIN].indexOf(roleId) < 0
					) {
						const [businessUserMapping] =
							await this.commonModelBusinessUserMapping.list(transaction, {
								filter: {
									userId
								}
							})

						const businessId: number = businessUserMapping.businessId
						const businessUsers =
							await this.commonModelBusinessUserMapping.list(transaction, {
								filter: {
									businessId
								}
							})

						const userIds = businessUsers.map((businessUser) => {
							return businessUser.userId
						})

						filter["userId"] = userIds
					}

					let [users, total] = await Promise.all([
						this.commonModelUser.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelUser.list(transaction, {
							filter,
							isCountOnly: true
						})
					])

					users = users.map((user) => ({
						...user,
						fullName: createFullName(user)
					}))

					return [users, total]
				}
			)

			return response.successResponse({
				message: `Users data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, ...restPayload} = req.body

			if (
				(restPayload?.password ?? "").trim() !== "" &&
				(restPayload?.currentPassword ?? "").trim() === ""
			) {
				throw new BadRequestException("Please enter current password")
			}

			const [user] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if user exists
					const [existingUser] = await this.commonModelUser.list(transaction, {
						filter: {
							userId
						}
					})
					if (!existingUser) {
						throw new BadRequestException("User doesn't exist")
					}

					// hash password
					if ((restPayload?.password ?? "").trim() !== "") {
						const isValidCurrentPassword: boolean = await bcrypt.compare(
							restPayload.currentPassword,
							existingUser.password
						)
						if (!isValidCurrentPassword) {
							throw new BadRequestException("Invalid current password")
						}

						const encryptedPassword: string = await bcrypt.hash(
							restPayload.password,
							parseInt(process.env.SALT_ROUNDS as string)
						)

						restPayload.password = encryptedPassword
						delete restPayload.currentPassword
					}

					// update user
					await this.commonModelUser.updateById(
						transaction,
						restPayload,
						userId,
						userId
					)

					// get updated details
					const [user] = await this.commonModelUser.list(transaction, {
						filter: {
							userId
						}
					})

					return [user]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: user
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {userIds} = req.body

			if (!userIds?.length) {
				throw new BadRequestException(`Please select user(s) to be deleted`)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingUsers = await this.commonModelUser.list(transaction, {
						filter: {
							userId: userIds
						}
					})
					if (!existingUsers.length) {
						const userIdsSet: Set<number> = new Set(
							existingUsers.map((obj) => obj.userId)
						)
						throw new BadRequestException(
							`Selected user(s) not found: ${userIds.filter((userId) => !userIdsSet.has(userId))}`
						)
					}

					await this.commonModelUser.softDeleteByIds(
						transaction,
						userIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `User(s) deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new UserController()
