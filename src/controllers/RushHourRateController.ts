import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class RushHourRateController {
	private commonModelRushHourRate

	private idColumnRushHourRate: string = "rushHourRateId"

	constructor() {
		this.commonModelRushHourRate = new CommonModel(
			"RushHourRate",
			this.idColumnRushHourRate,
			[]
		)

		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
		this.delete = this.delete.bind(this)
	}

	public async list(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {roleId}: Headers = req.headers

			const {filter, range, sort} = await listAPIPayload(req.body)

			const [rushHourRates, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [rushHourRates, total] = await Promise.all([
						this.commonModelRushHourRate.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelRushHourRate.list(transaction, {
							filter,
							isCountOnly: true
						})
					])

					return [rushHourRates, total]
				}
			)

			return response.successResponse({
				message: `Rush hour rate data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: rushHourRates
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const payload = Array.isArray(req.body) ? req.body : [req.body]

			const [rushHourRate] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// mark existing rush hour rate as deleted
					await this.commonModelRushHourRate.softDeleteByFilter(
						transaction,
						{},
						userId
					)

					// update
					await this.commonModelRushHourRate.bulkCreate(
						transaction,
						payload.filter((el) => el.maxPrice),
						userId
					)
					await this.commonModelRushHourRate.bulkCreate(
						transaction,
						payload.filter((el) => !el.maxPrice),
						userId
					)

					// get updated details
					const [rushHourRate] = await this.commonModelRushHourRate.list(
						transaction,
						{
							range: {
								all: true
							}
						}
					)

					return [rushHourRate]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: rushHourRate
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {rushHourRateIds} = req.body

			if (!rushHourRateIds?.length) {
				throw new BadRequestException(
					`Please select rush hour rate to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingRushHourRates = await this.commonModelRushHourRate.list(
						transaction,
						{
							filter: {
								rushHourRateId: rushHourRateIds
							}
						}
					)
					if (!existingRushHourRates.length) {
						const rushHourRateIdsSet: Set<number> = new Set(
							existingRushHourRates.map((obj) => obj.rushHourRateId)
						)
						throw new BadRequestException(
							`Selected rush hour rate not found: ${rushHourRateIds.filter((rushHourRateId) => !rushHourRateIdsSet.has(rushHourRateId))}`
						)
					}

					await this.commonModelRushHourRate.softDeleteByIds(
						transaction,
						rushHourRateIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Rush hour rate deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new RushHourRateController()
