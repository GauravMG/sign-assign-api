import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class RoleController {
	private commonModelRole

	private idColumnRole: string = "roleId"

	constructor() {
		this.commonModelRole = new CommonModel("Role", this.idColumnRole, ["name"])

		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
	}

	public async list(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {roleId}: Headers = req.headers

			const {filter, range, sort} = await listAPIPayload(req.body)

			const [roles, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelRole.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelRole.list(transaction, {
							filter,
							isCountOnly: true
						})
					])
				}
			)

			return response.successResponse({
				message: `Roles data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: roles
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId: roleIdHeaders}: Headers = req.headers

			const {roleId, ...restPayload} = req.body

			const [role] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if role exists
					const [existingRole] = await this.commonModelRole.list(transaction, {
						filter: {
							roleId
						}
					})
					if (!existingRole) {
						throw new BadRequestException("Role doesn't exist")
					}

					// update role
					await this.commonModelRole.updateById(
						transaction,
						restPayload,
						roleId,
						userId
					)

					// get updated details
					const [role] = await this.commonModelRole.list(transaction, {
						filter: {
							roleId
						}
					})

					return [role]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: role
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new RoleController()
