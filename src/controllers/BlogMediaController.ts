import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class BlogMediaController {
	private commonModelBlogMedia

	private idColumnBlogMedia: string = "blogMediaId"

	constructor() {
		this.commonModelBlogMedia = new CommonModel(
			"BlogMedia",
			this.idColumnBlogMedia,
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

			const [blogMedias] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const blogMedias = await this.commonModelBlogMedia.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [blogMedias]
				}
			)

			return response.successResponse({
				message: `Blog media created successfully`,
				data: blogMedias
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

			const [blogMedias, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelBlogMedia.list(transaction, {
							filter,
							range,
							sort
						}),
						this.commonModelBlogMedia.list(transaction, {
							filter,
							isCountOnly: true
						})
					])
				}
			)

			return response.successResponse({
				message: `Blog media data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: blogMedias
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			let {blogMediaId, ...restPayload} = req.body

			const [blogMedia] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingBlogMedia] = await this.commonModelBlogMedia.list(
						transaction,
						{
							filter: {
								blogMediaId
							}
						}
					)
					if (!existingBlogMedia) {
						throw new BadRequestException("Blog media doesn't exist")
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
					await this.commonModelBlogMedia.updateById(
						transaction,
						restPayload,
						blogMediaId,
						userId
					)

					// get updated details
					const [blogMedia] = await this.commonModelBlogMedia.list(
						transaction,
						{
							filter: {
								blogMediaId
							}
						}
					)

					return [blogMedia]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: blogMedia
			})
		} catch (error) {
			next(error)
		}
	}

	public async updateSequence(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const payload: {blogMediaId: number; sequenceNumber: number}[] = req.body

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingBlogMedia] = await this.commonModelBlogMedia.list(
						transaction,
						{
							filter: {
								blogMediaId: payload.map((el) => el.blogMediaId)
							}
						}
					)
					if (!existingBlogMedia) {
						throw new BadRequestException("Blog media doesn't exist")
					}

					// update
					for (let i = 0; i < payload?.length; i++) {
						await this.commonModelBlogMedia.updateById(
							transaction,
							{
								sequenceNumber: payload[i].sequenceNumber
							},
							payload[i].blogMediaId,
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

			const {blogMediaIds} = req.body

			if (!blogMediaIds?.length) {
				throw new BadRequestException(`Please select blog media to be deleted`)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingBlogMedia = await this.commonModelBlogMedia.list(
						transaction,
						{
							filter: {
								blogMediaId: blogMediaIds
							}
						}
					)
					if (!existingBlogMedia.length) {
						const blogMediaIdsSet: Set<number> = new Set(
							existingBlogMedia.map((obj) => obj.blogMediaId)
						)
						throw new BadRequestException(
							`Selected blog medias not found: ${blogMediaIds.filter((blogMediaId) => !blogMediaIdsSet.has(blogMediaId))}`
						)
					}

					await this.commonModelBlogMedia.softDeleteByIds(
						transaction,
						blogMediaIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Blog medias deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new BlogMediaController()
