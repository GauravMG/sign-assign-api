import bcrypt from "bcrypt"
import {NextFunction, Request, Response} from "express"

import {
	createFullName,
	listAPIPayload,
	splitFullName,
	validatePassword
} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {Role} from "../types/auth"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"
import {createJWTToken} from "../utils/Jwt"

class UserController {
	private commonModelUser
	private commonModelRole
	private commonModelBusinessUserMapping
	private commonModelUserAddress
	private commonModelUserDiscount
	private commonModelLoginHistory

	private idColumnUser: string = "userId"
	private idColumnRole: string = "roleId"
	private idColumnBusinessUserMapping: string = "businessUserMappingId"
	private idColumnUserAddress: string = "userAddressId"
	private idColumnUserDiscount: string = "userDiscountId"
	private idColumnLoginHistory: string = "loginHistoryId"

	constructor() {
		this.commonModelUser = new CommonModel("User", this.idColumnUser, [
			"firstName",
			"lastName",
			"email",
			"mobile"
		])
		this.commonModelRole = new CommonModel("Role", this.idColumnRole, [])
		this.commonModelBusinessUserMapping = new CommonModel(
			"BusinessUserMapping",
			this.idColumnBusinessUserMapping,
			[]
		)
		this.commonModelUserAddress = new CommonModel(
			"UserAddress",
			this.idColumnUserAddress,
			[]
		)
		this.commonModelUserDiscount = new CommonModel(
			"UserDiscount",
			this.idColumnUserDiscount,
			[]
		)
		this.commonModelLoginHistory = new CommonModel(
			"LoginHistory",
			this.idColumnLoginHistory,
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

			const emails: string[] = []
			payload = payload.map(({fullName, ...restPayload}) => {
				emails.push(restPayload.email)
				if (
					(fullName ?? "").trim() !== "" &&
					(restPayload.firstName ?? "").trim() === ""
				) {
					const splittedFullName = splitFullName(fullName)
					restPayload.firstName = splittedFullName.firstName
					restPayload.lastName = splittedFullName.lastName
				}

				return {
					...restPayload,
					isActive: true
				}
			})

			const [users, jwtToken] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if users exist
					const existingUsers = await this.commonModelUser.list(transaction, {
						filter: {
							email: emails
						},
						range: {all: true}
					})
					if (existingUsers.length) {
						const emailSet: Set<string> = new Set(
							existingUsers.map((obj) => obj.email)
						)
						throw new BadRequestException(
							`Email id(s) already exist in system: ${emails.filter((email) => emailSet.has(email))}`
						)
					}

					for (let i = 0; i < payload?.length; i++) {
						if ((payload[i].password ?? "").trim() !== "") {
							const passwordValidation = validatePassword(payload[i].password)
							if (!passwordValidation.valid) {
								throw new BadRequestException(
									"Invalid password format",
									undefined,
									passwordValidation.rules
								)
							}

							// hash password
							const encryptedPassword: string = await bcrypt.hash(
								payload[i].password,
								parseInt(process.env.SALT_ROUNDS as string)
							)

							payload[i].password = encryptedPassword
						}
					}

					// create users
					const users = await this.commonModelUser.bulkCreate(
						transaction,
						payload,
						userId
					)

					if (roleId === Role.BUSINESS_ADMIN) {
						// get user's business
						const [business] = await this.commonModelBusinessUserMapping.list(
							transaction,
							{
								filter: {userId}
							}
						)

						if (business) {
							// map user with business
							await this.commonModelBusinessUserMapping.bulkCreate(
								transaction,
								users.map(({userId}) => ({
									businessId: business.businessId,
									userId
								})),
								userId
							)
						}
					}

					let jwtToken: string | null = null
					if (users.length === 1) {
						// generate jwt token
						jwtToken = createJWTToken({
							userId: users[0].userId
						})

						// create login history
						await this.commonModelLoginHistory.bulkCreate(
							transaction,
							[
								{
									userId: users[0].userId,
									jwtToken,
									deviceType: "web"
								}
							],
							users[0].userId
						)
					}

					return [users, jwtToken]
				}
			)

			return response.successResponse({
				message: `User(s) created successfully`,
				data: users,
				jwtToken
			})
		} catch (error) {
			next(error)
		}
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
						[Role.SUPER_ADMIN, Role.STAFF].indexOf(roleId) < 0
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

					const userIds: number[] = users.map(({userId}) => Number(userId))
					const roleIds: number[] = users.map(({roleId}) => Number(roleId))

					const [userAddresses, userDiscounts, roles] = await Promise.all([
						this.commonModelUserAddress.list(transaction, {
							filter: {
								userId: userIds
							},
							range: {
								all: true
							}
						}),

						this.commonModelUserDiscount.list(transaction, {
							filter: {
								userId: userIds
							},
							range: {
								all: true
							}
						}),

						this.commonModelRole.list(transaction, {
							filter: {
								roleId: roleIds
							},
							range: {
								all: true
							}
						})
					])

					const userAddressMap = userAddresses.reduce((acc, userAddress) => {
						acc[userAddress.userId] = acc[userAddress.userId] || []
						acc[userAddress.userId].push(userAddress)
						return acc
					}, {})

					const userDiscountMap: any = new Map(
						userDiscounts.map((userDiscount) => [
							userDiscount.userId,
							userDiscount
						])
					)

					const roleMap = new Map(roles.map((role) => [role.roleId, role]))

					users = users.map((user) => ({
						...user,
						fullName: createFullName(user),
						role: roleMap.get(user.roleId),
						userAddresses: userAddressMap[user.userId] || [],
						userDiscountPercentage:
							userDiscountMap.get(user.userId)?.discountPercentage || null
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

			const {userId: loggedInUserId, roleId}: Headers = req.headers

			const {userId, ...restPayload} = req.body

			if (
				userId === loggedInUserId &&
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
						if ((restPayload?.currentPassword ?? "").trim() !== "") {
							const isValidCurrentPassword: boolean = await bcrypt.compare(
								restPayload.currentPassword,
								existingUser.password
							)
							if (!isValidCurrentPassword) {
								throw new BadRequestException("Invalid current password")
							}
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
