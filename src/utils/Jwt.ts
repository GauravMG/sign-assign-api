import {NextFunction, Request, Response} from "express"
import jwt from "jsonwebtoken"

import publicRoutes from "../../schemas/publicRoutes.json"
import {createFullName} from "../helpers"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {UnauthorizedException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {UrlSchema} from "../types/common"

// Secret keys (should be stored securely, e.g., in environment variables)
const ACCESS_TOKEN_SECRET: string = process.env.JWT_SECRET_KEY as string

// Function to create a JWT token
export const createJWTToken = (
	payload: object,
	expiresIn: string = process.env.JWT_TOKEN_EXPIRATION as string
): string => {
	return jwt.sign(payload, ACCESS_TOKEN_SECRET, {expiresIn})
}

// Middleware to validate the JWT token
export const validateJWTToken = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const reqUrl: string = req.url
		const reqMethod: string = req.method

		let token: string = req.headers.authorization as string

		const publicApi: UrlSchema | undefined = publicRoutes.find(
			(el) => el.apiPath === reqUrl && el.method === reqMethod
		)
		if (publicApi && !token) {
			return next()
		}

		if (!token) {
			throw new UnauthorizedException("Missing authorization header")
		}

		token = token.replace("Bearer ", "").trim()

		const decoded = await jwt.verify(
			token,
			process.env.JWT_SECRET_KEY as string
		)
		if (!decoded) {
			throw new UnauthorizedException("Invalid token")
		}
		const userId =
			typeof decoded === "string"
				? (JSON.parse(decoded)?.userId ?? null)
				: (decoded?.userId ?? null)
		if (!userId) {
			throw new UnauthorizedException("User does not exist")
		}
		const commonModelUser = new CommonModel("User", "userId", [])
		const commonModelLoginHistory = new CommonModel(
			"LoginHistory",
			"loginHistoryId",
			[]
		)
		const commonModelBusinessUserMapping = new CommonModel(
			"BusinessUserMapping",
			"businessUserMappingId",
			[]
		)

		const [[user], [loginHistory], [businessUserMapping]] =
			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						commonModelUser.list(transaction, {
							filter: {
								userId
							}
						}),

						commonModelLoginHistory.list(transaction, {
							filter: {
								userId
							}
						}),

						commonModelBusinessUserMapping.list(transaction, {
							filter: {
								userId
							}
						})
					])
				}
			)
		if (!user) {
			throw new UnauthorizedException("User does not exist")
		}
		if (!loginHistory) {
			throw new UnauthorizedException("Please login again")
		}
		if (!user.status) {
			throw new UnauthorizedException(
				"Your account is in-active. Please contact admin."
			)
		}

		req.headers.userId = user.userId
		req.headers.roleId = user.roleId
		req.headers.userFullName = JSON.stringify({
			fullName: createFullName(user)
		})
		req.headers.businessId = businessUserMapping?.businessId ?? null

		next()
	} catch (error) {
		next(error)
	}
}
