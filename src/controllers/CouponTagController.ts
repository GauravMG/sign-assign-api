import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class CouponTagController {
	private commonModelCouponTag

	private idColumnCouponTag: string = "couponTagId"

	constructor() {
		this.commonModelCouponTag = new CommonModel(
			"CouponTag",
			this.idColumnCouponTag,
			[]
		)

		this.save = this.save.bind(this)
		this.list = this.list.bind(this)
		this.delete = this.delete.bind(this)
	}

	public async save(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			let payload = Array.isArray(req.body) ? req.body : [req.body]

			const [couponTags] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// delete old entries
					await this.commonModelCouponTag.softDeleteByFilter(
						transaction,
						{
							couponId: payload.map((el) => el.couponId)
						},
						userId
					)

					// bulk create new entries
					const couponTags = await this.commonModelCouponTag.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [couponTags]
				}
			)

			return response.successResponse({
				message: `Coupon tag${payload.length > 1 ? "s" : ""} updated successfully`,
				data: couponTags
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

			const [couponTags, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					return await Promise.all([
						this.commonModelCouponTag.list(transaction, {
							filter,
							range,
							sort
						}),
						this.commonModelCouponTag.list(transaction, {
							filter,
							isCountOnly: true
						})
					])
				}
			)

			return response.successResponse({
				message: `Coupon tag data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: couponTags
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {couponTagIds} = req.body

			if (!couponTagIds?.length) {
				throw new BadRequestException(`Please select coupon tag to be deleted`)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingCouponTag = await this.commonModelCouponTag.list(
						transaction,
						{
							filter: {
								couponTagId: couponTagIds
							}
						}
					)
					if (!existingCouponTag.length) {
						const couponTagIdsSet: Set<number> = new Set(
							existingCouponTag.map((obj) => obj.couponTagId)
						)
						throw new BadRequestException(
							`Selected coupon tags not found: ${couponTagIds.filter((couponTagId) => !couponTagIdsSet.has(couponTagId))}`
						)
					}

					await this.commonModelCouponTag.softDeleteByIds(
						transaction,
						couponTagIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Coupon tags deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new CouponTagController()
