import bcrypt from "bcrypt"
import {NextFunction, Request, Response} from "express"
import jwt from "jsonwebtoken"

import {generateOTP, validateEmail, validatePassword} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException, UnauthorizedException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {Role, VerificationType} from "../types/auth"
import {Headers} from "../types/common"
import {createJWTToken} from "../utils/Jwt"

class AuthController {
	private commonModelUser
	private commonModelRole
	private commonModelVerification
	private commonModelLoginHistory
	private commonModelBusiness
	private commonModelBusinessUserMapping

	private idColumnUser: string = "userId"
	private idColumnRole: string = "roleId"
	private idColumnVerification: string = "verificationId"
	private idColumnLoginHistory: string = "loginHistoryId"
	private idColumnBusiness: string = "businessId"
	private idColumnBusinessUserMapping: string = "businessUserMappingId"

	constructor() {
		this.commonModelUser = new CommonModel("User", this.idColumnUser, [
			"roleId",
			"fullName",
			"mobile"
		])
		this.commonModelRole = new CommonModel("Role", this.idColumnRole, ["name"])
		this.commonModelVerification = new CommonModel(
			"Verification",
			this.idColumnVerification,
			[]
		)
		this.commonModelLoginHistory = new CommonModel(
			"LoginHistory",
			this.idColumnLoginHistory,
			[]
		)
		this.commonModelBusiness = new CommonModel(
			"Business",
			this.idColumnBusiness,
			[
				"name",
				"type",
				"yearOfIncorporation",
				"address",
				"city",
				"state",
				"country"
			]
		)
		this.commonModelBusinessUserMapping = new CommonModel(
			"BusinessUserMapping",
			this.idColumnBusinessUserMapping,
			[]
		)

		this.checkEmail = this.checkEmail.bind(this)

		this.signIn = this.signIn.bind(this)
		this.getMe = this.getMe.bind(this)
		this.refreshToken = this.refreshToken.bind(this)
		this.logout = this.logout.bind(this)

		this.register = this.register.bind(this)
		this.sendOTP = this.sendOTP.bind(this)
		this.resetPassword = this.resetPassword.bind(this)

		this.changePassword = this.changePassword.bind(this)
	}

	private async validateUserAccount({
		password,
		otp,
		verificationType,
		...restPayload
	}: any) {
		try {
			const [user] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					if ((restPayload?.filter?.email ?? "").trim() !== "") {
						restPayload.filter.email = restPayload.filter.email.toLowerCase()
					}

					let [user] = await this.commonModelUser.list(transaction, {
						...restPayload
					})
					if (!user) {
						throw new UnauthorizedException("User doesn't exist")
					}

					const {userId, roleId} = user

					let [role] = await this.commonModelRole.list(transaction, {
						filter: {
							roleId
						}
					})
					user = {
						...user,
						role
					}
					if ((password ?? "").toString().trim() !== "") {
						// check if account active or not
						// if ((user.password ?? "").trim() !== "") {
						// throw new UnauthorizedException(
						// 	"Account not yet verified. Please check your registered email id for verification email sent to you at the time of creation of your account."
						// )

						// check if password matches
						const isValidPassword: boolean = await bcrypt.compare(
							password,
							user.password
						)

						if (!isValidPassword) {
							throw new UnauthorizedException("Incorrect password")
						}
						// } else {
						// 	throw new BadRequestException(
						// 		"Seems like account verification is pending. Please check your registered Email ID for a verification email and complete your account verification process."
						// 	)
						// }
					}

					// if ((otp ?? "").toString().trim() !== "") {
					// 	const [otpResult] = await this.commonModelVerification.list(
					// 		transaction,
					// 		{
					// 			filter: {
					// 				userId,
					// 				verificationType
					// 			},
					// 			range: {
					// 				page: 1,
					// 				pageSize: 1
					// 			}
					// 		}
					// 	)

					// 	if (!otpResult) {
					// 		throw new UnauthorizedException("Please generate OTP again")
					// 	}

					// 	if (otpResult.hash !== otp.toString()) {
					// 		throw new UnauthorizedException("Invalid OTP entered")
					// 	}

					// 	await this.commonModelVerification.softDeleteByFilter(
					// 		transaction,
					// 		{userId, verificationType},
					// 		userId
					// 	)
					// }

					// chec personal info flag
					// user.isPersonalInfoCompleted = false
					// if (
					// 	(user.firstName ?? "").trim() !== "" &&
					// 	(user.password ?? "").trim() !== ""
					// ) {
					// 	user.isPersonalInfoCompleted = true
					// }

					// check if account active or not
					if (!user.status) {
						throw new UnauthorizedException(
							"Your account is in-active. Please contact admin."
						)
					}

					// if ([Role.BROKER_ADMIN, Role.USER].indexOf(user.roleId) >= 0) {
					// 	// get user business + business contact person and check business flag + business contact person flag
					// 	user.isBusinessInfoCompleted = false
					// 	user.isContactPersonInfoCompleted = false
					// 	user.business = null
					// 	user.contactPerson = null

					// 	const userModel = new UserModel()
					// 	const [userBusinessPair] = await userModel.getBusinessByUserIds(
					// 		transaction,
					// 		[userId]
					// 	)
					// 	if (userBusinessPair) {
					// 		if (userBusinessPair.business) {
					// 			user.business = userBusinessPair.business ?? null

					// 			if ((userBusinessPair.business?.name ?? "").trim() !== "") {
					// 				user.isBusinessInfoCompleted = true
					// 			}
					// 		}
					// 	}
					// }

					return [{...user, unreadCount: 10}]
				}
			)

			return {...user, unreadCount: 10}
		} catch (error) {
			throw error
		}
	}

	public async checkEmail(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {email} = req.body

			const [data] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if email exists
					const [existingUser] = await this.commonModelUser.list(transaction, {
						filter: {
							email
						}
					})
					if (!existingUser) {
						throw new BadRequestException("Email doesn't exists")
					}

					// if user is already active marked after verification
					if (existingUser.isActive) {
						throw new BadRequestException(
							"Seems like you have already verified your account. Please login to continue to the dashboard."
						)
					}

					return [existingUser]
				}
			)

			return response.successResponse({
				message: "Check email",
				data: {
					isActive: data.isActive
				}
			})
		} catch (error) {
			next(error)
		}
	}

	public async signIn(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {email, password} = req.body
			const deviceType: string = "web"

			// validation on empty email and password
			if ((email ?? "").trim() === "") {
				throw new UnauthorizedException("Please enter your email")
			}

			if ((password ?? "").trim() === "") {
				throw new UnauthorizedException("Please enter password")
			}
			const user = await this.validateUserAccount({
				filter: {email},
				password
			})
			const {userId} = user

			if (!user.isActive) {
				throw new UnauthorizedException("Account not verified")
			}

			// generate jwt token
			const jwtToken: string = createJWTToken({
				userId
			})

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create login history
					await this.commonModelLoginHistory.bulkCreate(
						transaction,
						[
							{
								userId,
								jwtToken,
								deviceType
							}
						],
						userId
					)
				}
			)

			return response.successResponse({
				message: `Logged in successfully`,
				jwtToken,
				data: user
			})
		} catch (error) {
			next(error)
		}
	}

	public async getMe(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId}: Headers = req.headers

			const user = await this.validateUserAccount({filter: {userId}})

			return response.successResponse({
				message: `My details`,
				data: user
			})
		} catch (error) {
			next(error)
		}
	}

	public async refreshToken(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			let accessToken: string = req.headers.authorization as string
			if (!accessToken) {
				throw new BadRequestException(
					"Missing authorization header.",
					"invalid_token"
				)
			}

			accessToken = accessToken.replace("Bearer ", "").trim()

			let decodedToken: any = jwt.decode(accessToken)
			if (!decodedToken) {
				throw new BadRequestException("Invalid token.", "invalid_token")
			}

			const user = await this.validateUserAccount({
				filter: {userId: decodedToken.userId}
			})

			// @ts-ignore
			delete decodedToken.iat
			// @ts-ignore
			delete decodedToken.exp
			// @ts-ignore
			delete decodedToken.nbf
			// @ts-ignore
			delete decodedToken.jti

			// generate new token
			const jwtToken: string = createJWTToken(decodedToken)

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// update login history
					await this.commonModelLoginHistory.updateByFilters(
						transaction,
						{
							jwtToken
						},
						{
							jwtToken: accessToken,
							userId: user.userId
						},
						user.userId
					)
				}
			)

			return response.successResponse({
				message: `Logged in successfully`,
				jwtToken,
				data: user
			})
		} catch (error) {
			next(error)
		}
	}

	public async logout(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			let jwtToken: string = req.headers.authorization as string
			if (!jwtToken) {
				throw new BadRequestException(
					"Missing authorization header.",
					"invalid_token"
				)
			}

			jwtToken = jwtToken.replace("Bearer ", "").trim()

			const {userId}: Headers = req.headers

			const user = await this.validateUserAccount({filter: {userId}})

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// update login history
					await this.commonModelLoginHistory.softDeleteByFilter(
						transaction,
						{
							jwtToken
						},
						user.userId
					)
				}
			)

			return response.successResponse({
				message: `Logged out successfully`
			})
		} catch (error) {
			next(error)
		}
	}

	public async register(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			let {roleId, firstName, lastName, email, business} = req.body
			roleId = parseInt(roleId)

			const verificationType: VerificationType = VerificationType.Registration

			const otp: string = generateOTP(6)

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if email already exists
					const [existingUser] = await this.commonModelUser.list(transaction, {
						filter: {
							email
						}
					})
					if (existingUser) {
						throw new BadRequestException("Email already exists")
					}

					if (!validateEmail(email)) {
						throw new BadRequestException("Please enter a valid email address.")
					}

					// create entry in user table
					const [user] = await this.commonModelUser.bulkCreate(transaction, [
						{
							firstName,
							lastName,
							email,
							roleId,
							isActive: false
						}
					])
					const {userId} = user

					if (
						roleId === Role.BUSINESS_ADMIN &&
						Object.keys(business ?? {}).length
					) {
						// create new business
						const [businessDetails] = await this.commonModelBusiness.bulkCreate(
							transaction,
							[business],
							userId
						)

						await this.commonModelBusinessUserMapping.bulkCreate(
							transaction,
							[
								{
									businessId: businessDetails.businessId,
									userId
								}
							],
							userId
						)
					}

					await this.commonModelVerification.bulkCreate(
						transaction,
						[
							{
								userId,
								hash: otp.toString(),
								verificationType
							}
						],
						userId
					)

					return []
				}
			)

			return response.successResponse({
				message: `Account created successfully. Please use the following OTP to verify your account - ${otp}.`
			})
		} catch (error) {
			next(error)
		}
	}

	public async sendOTP(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {email, verificationType} = req.body

			const otp: string = generateOTP(6)

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if email already exists
					const [existingUser] = await this.commonModelUser.list(transaction, {
						filter: {
							email
						}
					})
					if (!existingUser) {
						throw new BadRequestException("Email doesn't exist")
					}

					const userId: number = existingUser.userId

					await this.commonModelVerification.softDeleteByFilter(
						transaction,
						{userId, verificationType},
						userId
					)

					await this.commonModelVerification.bulkCreate(
						transaction,
						[
							{
								userId,
								hash: otp.toString(),
								verificationType
							}
						],
						userId
					)

					return []
				}
			)

			return response.successResponse({
				message: `Please use the following OTP - ${otp}.`
			})
		} catch (error) {
			next(error)
		}
	}

	public async resetPassword(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {email, hash, verificationType, newPassword} = req.body

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if email exists
					const [existingUser] = await this.commonModelUser.list(transaction, {
						filter: {
							email
						}
					})
					if (!existingUser) {
						throw new BadRequestException("Email doesn't exist")
					}

					const userId: number = existingUser.userId

					const [verificationData] = await this.commonModelVerification.list(
						transaction,
						{
							filter: {
								userId,
								hash,
								verificationType
							},
							range: {
								page: 1,
								pageSize: 1
							},
							sort: [
								{
									orderBy: "createdAt",
									orderDir: "desc"
								}
							]
						}
					)
					if (!verificationData) {
						throw new BadRequestException("Invalid OTP")
					}

					const passwordValidation = validatePassword(newPassword)
					if (!passwordValidation.valid) {
						throw new BadRequestException(
							"Invalid password format",
							undefined,
							passwordValidation.rules
						)
					}

					// hash password
					const encryptedPassword: string = await bcrypt.hash(
						newPassword,
						parseInt(process.env.SALT_ROUNDS as string)
					)

					await Promise.all([
						this.commonModelVerification.softDeleteByFilter(
							transaction,
							{userId, verificationType},
							userId
						),

						this.commonModelUser.updateById(
							transaction,
							{
								isActive: true,
								password: encryptedPassword
							},
							userId,
							userId
						)
					])

					return [verificationData]
				}
			)

			return response.successResponse({
				message: `Email verified and password set successfully`
			})
		} catch (error) {
			next(error)
		}
	}

	public async changePassword(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId}: Headers = req.headers
			const {currentPassword, newPassword} = req.body

			await this.validateUserAccount({
				filter: {userId},
				password: currentPassword
			})

			const passwordValidation = validatePassword(newPassword)
			if (!passwordValidation.valid) {
				throw new BadRequestException(
					"Invalid password format",
					undefined,
					passwordValidation.rules
				)
			}

			// hash password
			const encryptedPassword: string = await bcrypt.hash(
				newPassword,
				parseInt(process.env.SALT_ROUNDS as string)
			)

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create entry in user table
					await this.commonModelUser.updateById(
						transaction,
						{
							password: encryptedPassword
						},
						userId,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Password changed successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new AuthController()
