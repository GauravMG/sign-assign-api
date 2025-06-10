import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class ProductMediaController {
	private commonModelProductMedia

	private idColumnProductMedia: string = "productMediaId"

	constructor() {
		this.commonModelProductMedia = new CommonModel(
			"ProductMedia",
			this.idColumnProductMedia,
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

			const [productMedias] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const productMedias = await this.commonModelProductMedia.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [productMedias]
				}
			)

			return response.successResponse({
				message: `Product media created successfully`,
				data: productMedias
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

			const [productMedias, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelProductMedia.list(transaction, {
							filter,
							range,
							sort
						}),
						this.commonModelProductMedia.list(transaction, {
							filter,
							isCountOnly: true
						})
					])
				}
			)

			return response.successResponse({
				message: `Product media data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: productMedias
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			let {productMediaId, ...restPayload} = req.body

			const [productMedia] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingProductMedia] =
						await this.commonModelProductMedia.list(transaction, {
							filter: {
								productMediaId
							}
						})
					if (!existingProductMedia) {
						throw new BadRequestException("Product media doesn't exist")
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
					await this.commonModelProductMedia.updateById(
						transaction,
						restPayload,
						productMediaId,
						userId
					)

					// get updated details
					const [productMedia] = await this.commonModelProductMedia.list(
						transaction,
						{
							filter: {
								productMediaId
							}
						}
					)

					return [productMedia]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: productMedia
			})
		} catch (error) {
			next(error)
		}
	}

	public async updateSequence(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const payload: {productMediaId: number; sequenceNumber: number}[] =
				req.body

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingBanner] = await this.commonModelProductMedia.list(
						transaction,
						{
							filter: {
								productMediaId: payload.map((el) => el.productMediaId)
							}
						}
					)
					if (!existingBanner) {
						throw new BadRequestException("Product media doesn't exist")
					}

					// update
					for (let i = 0; i < payload?.length; i++) {
						await this.commonModelProductMedia.updateById(
							transaction,
							{
								sequenceNumber: payload[i].sequenceNumber
							},
							payload[i].productMediaId,
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

			const {productMediaIds} = req.body

			if (!productMediaIds?.length) {
				throw new BadRequestException(
					`Please select product media to be deleted`
				)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingProductMedia = await this.commonModelProductMedia.list(
						transaction,
						{
							filter: {
								productMediaId: productMediaIds
							}
						}
					)
					if (!existingProductMedia.length) {
						const productMediaIdsSet: Set<number> = new Set(
							existingProductMedia.map((obj) => obj.productMediaId)
						)
						throw new BadRequestException(
							`Selected product medias not found: ${productMediaIds.filter((productMediaId) => !productMediaIdsSet.has(productMediaId))}`
						)
					}

					await this.commonModelProductMedia.softDeleteByIds(
						transaction,
						productMediaIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Product medias deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new ProductMediaController()
