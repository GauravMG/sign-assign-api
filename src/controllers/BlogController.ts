import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"
import {isWebUser} from "../types/auth"

class BlogController {
	private commonModelBlog
	private commonModelBlogMedia

	private idColumnBlog: string = "blogId"
	private idColumnBlogMedia: string = "blogMediaId"

	constructor() {
		this.commonModelBlog = new CommonModel("Blog", this.idColumnBlog, [
			"title",
			"description"
		])
		this.commonModelBlogMedia = new CommonModel(
			"BlogMedia",
			this.idColumnBlogMedia,
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

			const [blog] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const blog = await this.commonModelBlog.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [blog]
				}
			)

			return response.successResponse({
				message: `Blog created successfully`,
				data: blog
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

			const {filter, range, sort, linkedEntities} = await listAPIPayload(
				req.body
			)

			const [blogs, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [blogs, total] = await Promise.all([
						this.commonModelBlog.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							range,
							sort
						}),

						this.commonModelBlog.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							isCountOnly: true
						})
					])

					if (linkedEntities) {
						const blogIds: number[] = []

						for (let i = 0; i < blogs?.length; i++) {
							blogIds.push(blogs[i].blogId)
						}

						let blogMedias = await this.commonModelBlogMedia.list(transaction, {
							filter: {
								...mandatoryFilters,
								blogId: blogIds
							},
							range: {
								all: true
							}
						})

						const blogMediaMap = new Map<number, any[]>()
						for (const blogMedia of blogMedias) {
							const blogMediaGroup = blogMediaMap.get(blogMedia.blogId) || []
							blogMediaGroup.push(blogMedia)
							blogMediaMap.set(blogMedia.blogId, blogMediaGroup)
						}

						blogs = blogs.map((blog) => ({
							...blog,
							blogMedias: blogMediaMap.get(blog.blogId) || []
						}))
					}

					return [blogs, total]
				}
			)

			return response.successResponse({
				message: `Blog data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: blogs
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {blogId, ...restPayload} = req.body

			const [blog] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingBlog] = await this.commonModelBlog.list(transaction, {
						filter: {
							blogId
						}
					})
					if (!existingBlog) {
						throw new BadRequestException("Blog doesn't exist")
					}

					// update
					await this.commonModelBlog.updateById(
						transaction,
						restPayload,
						blogId,
						userId
					)

					// get updated details
					const [blog] = await this.commonModelBlog.list(transaction, {
						filter: {
							blogId
						}
					})

					return [blog]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: blog
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {blogIds} = req.body

			if (!blogIds?.length) {
				throw new BadRequestException(`Please select blog to be deleted`)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingBlogs = await this.commonModelBlog.list(transaction, {
						filter: {
							blogId: blogIds
						}
					})
					if (!existingBlogs.length) {
						const blogIdsSet: Set<number> = new Set(
							existingBlogs.map((obj) => obj.blogId)
						)
						throw new BadRequestException(
							`Selected blog not found: ${blogIds.filter((blogId) => !blogIdsSet.has(blogId))}`
						)
					}

					await this.commonModelBlog.softDeleteByIds(
						transaction,
						blogIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Blog deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new BlogController()
