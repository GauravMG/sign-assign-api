import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class VariantMediaController {
	private commonModelVariantMedia

	private idColumnVariantMedia: string = "variantMediaId"

	constructor() {
		this.commonModelVariantMedia = new CommonModel(
			"VariantMedia",
			this.idColumnVariantMedia,
			[]
		)

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

			const [variantMedias] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const variantMedias = await this.commonModelVariantMedia.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [variantMedias]
				}
			)

			return response.successResponse({
				message: `Variant media created successfully`,
				data: variantMedias
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

			const [variantMedias, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelVariantMedia.list(transaction, {
							filter,
							range,
							sort
						}),
						this.commonModelVariantMedia.list(transaction, {
							filter,
							isCountOnly: true
						})
					])
				}
			)

			return response.successResponse({
				message: `Variant media data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: variantMedias
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			let {variantMediaId, ...restPayload} = req.body

			const [variantMedia] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingVariantMedia] =
						await this.commonModelVariantMedia.list(transaction, {
							filter: {
								variantMediaId
							}
						})
					if (!existingVariantMedia) {
						throw new BadRequestException("Variant media doesn't exist")
					}

					// for size as we are taking size as in kb so taking it as string
					restPayload = {
						...restPayload,
						size:
							typeof restPayload.size === "number"
								? String(restPayload.size)
								: restPayload.size
					}

					// update
					await this.commonModelVariantMedia.updateById(
						transaction,
						restPayload,
						variantMediaId,
						userId
					)

					// get updated details
					const [variantMedia] = await this.commonModelVariantMedia.list(
						transaction,
						{
							filter: {
								variantMediaId
							}
						}
					)

					return [variantMedia]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: variantMedia
			})
		} catch (error) {
			next(error)
		}
	}

	public async updateSequence(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const payload: {variantMediaId: number; sequenceNumber: number}[] =
				req.body

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingBanner] = await this.commonModelVariantMedia.list(
						transaction,
						{
							filter: {
								variantMediaId: payload.map((el) => el.variantMediaId)
							}
						}
					)
					if (!existingBanner) {
						throw new BadRequestException("Banners doesn't exist")
					}

					// update
					for (let i = 0; i < payload?.length; i++) {
						await this.commonModelVariantMedia.updateById(
							transaction,
							{
								sequenceNumber: payload[i].sequenceNumber
							},
							payload[i].variantMediaId,
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

			const {variantMediaIds} = req.body

			if (!variantMediaIds?.length) {
				throw new BadRequestException(
					`Please select variant media to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingVariantMedia = await this.commonModelVariantMedia.list(
						transaction,
						{
							filter: {
								variantMediaId: variantMediaIds
							}
						}
					)
					if (!existingVariantMedia.length) {
						const variantMediaIdsSet: Set<number> = new Set(
							existingVariantMedia.map((obj) => obj.variantMediaId)
						)
						throw new BadRequestException(
							`Selected variant medias not found: ${variantMediaIds.filter((variantMediaId) => !variantMediaIdsSet.has(variantMediaId))}`
						)
					}

					await this.commonModelVariantMedia.softDeleteByIds(
						transaction,
						variantMediaIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Variant medias deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new VariantMediaController()
