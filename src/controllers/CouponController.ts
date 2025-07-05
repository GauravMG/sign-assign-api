import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"
import {isWebUser} from "../types/auth"

class CouponController {
	private commonModelCoupon
	private commonModelUser

	private idColumnCoupon: string = "couponId"
	private idColumnUser: string = "userId"

	constructor() {
		this.commonModelCoupon = new CommonModel("Coupon", this.idColumnCoupon, [
			"couponCode"
		])
		this.commonModelUser = new CommonModel("User", this.idColumnUser, [])

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

			const [coupon] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const coupon = await this.commonModelCoupon.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [coupon]
				}
			)

			return response.successResponse({
				message: `Coupon created successfully`,
				data: coupon
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

			const [coupons, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [coupons, total] = await Promise.all([
						this.commonModelCoupon.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							range,
							sort
						}),

						this.commonModelCoupon.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							isCountOnly: true
						})
					])

					let userIds: number[] = coupons
						.map((coupon) => coupon.userId)
						.filter(Boolean)

					const users = await this.commonModelUser.list(transaction, {
						filter: {
							userId: userIds
						}
					})

					const userMap = new Map(users.map((user) => [user.userId, user]))

					coupons = coupons.map((coupon) => ({
						...coupon,
						user: coupon.userId ? userMap.get(coupon.userId) : null
					}))

					return [coupons, total]
				}
			)

			return response.successResponse({
				message: `Coupon data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: coupons
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {couponId, ...restPayload} = req.body

			const [coupon] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingCoupon] = await this.commonModelCoupon.list(
						transaction,
						{
							filter: {
								couponId
							}
						}
					)
					if (!existingCoupon) {
						throw new BadRequestException("Coupon doesn't exist")
					}

					// update
					await this.commonModelCoupon.updateById(
						transaction,
						restPayload,
						couponId,
						userId
					)

					// get updated details
					const [coupon] = await this.commonModelCoupon.list(transaction, {
						filter: {
							couponId
						}
					})

					return [coupon]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: coupon
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {couponIds} = req.body

			if (!couponIds?.length) {
				throw new BadRequestException(`Please select coupon to be deleted`)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingCoupons = await this.commonModelCoupon.list(
						transaction,
						{
							filter: {
								couponId: couponIds
							}
						}
					)
					if (!existingCoupons.length) {
						const couponIdsSet: Set<number> = new Set(
							existingCoupons.map((obj) => obj.couponId)
						)
						throw new BadRequestException(
							`Selected coupon not found: ${couponIds.filter((couponId) => !couponIdsSet.has(couponId))}`
						)
					}

					await this.commonModelCoupon.softDeleteByIds(
						transaction,
						couponIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Coupon deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new CouponController()
