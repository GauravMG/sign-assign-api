import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"
import {isWebUser} from "../types/auth"

class BannerController {
	private commonModelBanner

	private idColumnBanner: string = "bannerId"

	constructor() {
		this.commonModelBanner = new CommonModel("Banner", this.idColumnBanner, [
			"name"
		])

		this.create = this.create.bind(this)
		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
		this.updateSequence = this.updateSequence.bind(this)
		this.delete = this.delete.bind(this)
	}

	public async create(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			let payload = Array.isArray(req.body) ? req.body : [req.body]

			const [banners] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const [highestSequenceNumberBanner] =
						await this.commonModelBanner.list(transaction, {
							range: {
								page: 1,
								pageSize: 1
							},
							sort: [
								{
									orderBy: "sequenceNumber",
									orderDir: "desc"
								}
							]
						})

					const lastSequenceNumber: number =
						highestSequenceNumberBanner?.sequenceNumber ?? 0

					// create
					const banners = await this.commonModelBanner.bulkCreate(
						transaction,
						payload.map((el, index) => ({
							...el,
							sequenceNumber: lastSequenceNumber + 1 + index
						})),
						userId
					)

					return [banners]
				}
			)

			return response.successResponse({
				message: `Banners created successfully`,
				data: banners
			})
		} catch (error) {
			next(error)
		}
	}

	public async list(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {roleId}: Headers = req.headers

			let mandatoryFilters: any = {}
			if (isWebUser(roleId)) {
				mandatoryFilters = {
					...mandatoryFilters,
					status: true
				}
			}

			const {filter, range, sort} = await listAPIPayload(req.body)

			const [banners, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelBanner.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							range,
							sort
						}),

						this.commonModelBanner.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							isCountOnly: true
						})
					])
				}
			)

			return response.successResponse({
				message: `Banners data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: banners
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {bannerId, ...restPayload} = req.body

			const [banner] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingBanner] = await this.commonModelBanner.list(
						transaction,
						{
							filter: {
								bannerId
							}
						}
					)
					if (!existingBanner) {
						throw new BadRequestException("Banner doesn't exist")
					}

					// update
					await this.commonModelBanner.updateById(
						transaction,
						restPayload,
						bannerId,
						userId
					)

					// get updated details
					const [banner] = await this.commonModelBanner.list(transaction, {
						filter: {
							bannerId
						}
					})

					return [banner]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: banner
			})
		} catch (error) {
			next(error)
		}
	}

	public async updateSequence(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const payload: {bannerId: number; sequenceNumber: number}[] = req.body

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingBanner] = await this.commonModelBanner.list(
						transaction,
						{
							filter: {
								bannerId: payload.map((el) => el.bannerId)
							}
						}
					)
					if (!existingBanner) {
						throw new BadRequestException("Banners doesn't exist")
					}

					// update
					for (let i = 0; i < payload?.length; i++) {
						await this.commonModelBanner.updateById(
							transaction,
							{
								sequenceNumber: payload[i].sequenceNumber
							},
							payload[i].bannerId,
							userId
						)
					}

					return []
				}
			)

			return response.successResponse({
				message: `Order updated successfully`
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {bannerIds} = req.body

			if (!bannerIds?.length) {
				throw new BadRequestException(`Please select banners to be deleted`)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingbanners = await this.commonModelBanner.list(
						transaction,
						{
							filter: {
								bannerId: bannerIds
							}
						}
					)
					if (!existingbanners.length) {
						const bannerIdsSet: Set<number> = new Set(
							existingbanners.map((obj) => obj.bannerId)
						)
						throw new BadRequestException(
							`Selected banners not found: ${bannerIds.filter((bannerId) => !bannerIdsSet.has(bannerId))}`
						)
					}

					await this.commonModelBanner.softDeleteByIds(
						transaction,
						bannerIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Banners deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new BannerController()
