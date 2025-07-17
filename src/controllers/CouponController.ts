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
	private commonModelCouponTag
	private commonModelProductCategory
	private commonModelProductSubCategory
	private commonModelProduct
	private commonModelUser
	private commonModelOrder

	private idColumnCoupon: string = "couponId"
	private idColumnCouponTag: string = "couponTagId"
	private idColumnProductCategory: string = "productCategoryId"
	private idColumnProductSubCategory: string = "productSubCategoryId"
	private idColumnProduct: string = "productId"
	private idColumnUser: string = "userId"
	private idColumnOrder: string = "orderId"

	constructor() {
		this.commonModelCoupon = new CommonModel("Coupon", this.idColumnCoupon, [
			"couponCode"
		])
		this.commonModelCouponTag = new CommonModel(
			"CouponTag",
			this.idColumnCouponTag,
			[]
		)
		this.commonModelProductCategory = new CommonModel(
			"ProductCategory",
			this.idColumnProductCategory,
			["name", "description"]
		)
		this.commonModelProductSubCategory = new CommonModel(
			"ProductSubCategory",
			this.idColumnProductSubCategory,
			["name", "description"]
		)
		this.commonModelProduct = new CommonModel("Product", this.idColumnProduct, [
			"name",
			"sku",
			"shortDescription",
			"description",
			"specification",
			"features"
		])
		this.commonModelUser = new CommonModel("User", this.idColumnUser, [])
		this.commonModelOrder = new CommonModel("Order", this.idColumnOrder, [])

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

			let {filter, range, sort, linkedEntities} = await listAPIPayload(req.body)
			let filterUserId: number | null = null
			if (filter?.userId) {
				filterUserId = filter.userId
				delete filter.userId
			}

			const [coupons, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					if (filter?.productId) {
						const [product] = await this.commonModelProduct.list(transaction, {
							filter: {
								productId: Number(filter.productId)
							},
							range: {
								page: 1,
								pageSize: 1
							}
						})

						if (product) {
							const customFiltersCouponTag = [
								{
									OR: [
										{
											referenceType: "product_category",
											referenceId: product.productCategoryId
										},
										{
											referenceType: "product_sub_category",
											referenceId: product.productSubCategoryId
										},
										{
											referenceType: "product",
											referenceId: product.productId
										}
									]
								}
							]

							const couponTags = await this.commonModelCouponTag.list(
								transaction,
								{
									customFilters: customFiltersCouponTag,
									range: {all: true}
								}
							)

							if (couponTags?.length) {
								if (!filter.couponId) {
									filter.couponId = []
								}

								if (!Array.isArray(filter.couponId)) {
									filter.couponId = [filter.couponId]
								}

								// ✅ Merge and deduplicate using Set properly
								const mergedCouponIds = [
									...filter.couponId,
									...couponTags.map((el) => Number(el.couponId))
								]
								filter.couponId = Array.from(new Set(mergedCouponIds))
							}
						}

						// ✅ Remove productId from filter after processing
						delete filter.productId
					}

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

					let userIds: number[] = []
					let couponIds: number[] = []

					coupons.map((coupon) => {
						if (coupon.userId) {
							userIds.push(Number(coupon.userId))
						}
						couponIds.push(coupon.couponId)
					})

					const orConditions = couponIds.map((id) => ({
						amountDetails: {
							path: ["couponData", "couponId"],
							equals: id
						}
					}))

					const [users, orders, couponTags] = await Promise.all([
						userIds.length
							? this.commonModelUser.list(transaction, {
									filter: {
										userId: userIds
									}
								})
							: [],

						this.commonModelOrder.list(transaction, {
							customFilters: [
								{
									amountDetails: {
										path: ["couponData"],
										not: null
									}
								},
								{
									OR: orConditions
								}
							]
						}),

						this.commonModelCouponTag.list(transaction, {
							filter: {
								...mandatoryFilters,
								couponId: couponIds
							},
							range: {
								all: true
							}
						})
					])

					const userMap = new Map(users.map((user) => [user.userId, user]))

					const ordersByCouponId = new Map()

					// Assume orders is your array of order objects
					orders.forEach((order) => {
						const couponId = order?.amountDetails?.couponData?.couponId

						if (couponId !== undefined && couponId !== null) {
							if (!ordersByCouponId.has(couponId)) {
								ordersByCouponId.set(couponId, [])
							}
							ordersByCouponId.get(couponId).push(order)
						}
					})

					let productCategoryIds: number[] = []
					let productSubCategoryIds: number[] = []
					let productIds: number[] = []
					couponTags.forEach((couponTag) => {
						if (couponTag.referenceType === "product_category") {
							productCategoryIds.push(Number(couponTag.referenceId))
						}
						if (couponTag.referenceType === "product_sub_category") {
							productSubCategoryIds.push(Number(couponTag.referenceId))
						}
						if (couponTag.referenceType === "product") {
							productIds.push(Number(couponTag.referenceId))
						}
					})

					const [
						selectedProductCategories,
						selectedProductSubCategories,
						selectedProducts
					] = await Promise.all([
						this.commonModelProductCategory.list(transaction, {
							filter: {
								productCategoryId: productCategoryIds
							},
							range: {all: true}
						}),

						this.commonModelProductSubCategory.list(transaction, {
							filter: {
								productSubCategoryId: productSubCategoryIds
							},
							range: {all: true}
						}),

						this.commonModelProduct.list(transaction, {
							filter: {
								productId: productIds
							},
							range: {all: true}
						})
					])

					const selectedProductCategoryMap: any = new Map(
						selectedProductCategories.map((selectedProductCategory) => [
							selectedProductCategory.productCategoryId,
							selectedProductCategory
						])
					)

					const selectedProductSubCategoryMap: any = new Map(
						selectedProductSubCategories.map((selectedProductSubCategory) => [
							selectedProductSubCategory.productSubCategoryId,
							selectedProductSubCategory
						])
					)

					const selectedProductMap: any = new Map(
						selectedProducts.map((selectedProduct) => [
							selectedProduct.productId,
							selectedProduct
						])
					)

					const couponTagMap = new Map<number, any[]>()
					for (let couponTag of couponTags) {
						if (couponTag.referenceType === "product_category") {
							couponTag = {
								...couponTag,
								referenceData: selectedProductCategoryMap.get(
									couponTag.referenceId
								)
							}
						}
						if (couponTag.referenceType === "product_sub_category") {
							couponTag = {
								...couponTag,
								referenceData: selectedProductSubCategoryMap.get(
									couponTag.referenceId
								)
							}
						}
						if (couponTag.referenceType === "product") {
							couponTag = {
								...couponTag,
								referenceData: selectedProductMap.get(couponTag.referenceId)
							}
						}

						const couponTagGroup = couponTagMap.get(couponTag.couponId) || []
						couponTagGroup.push(couponTag)
						couponTagMap.set(couponTag.couponId, couponTagGroup)
					}

					coupons = coupons.map((coupon) => {
						const ordersForCoupon = ordersByCouponId.get(coupon.couponId) || []
						const totalOrderCount: number = ordersForCoupon.length

						let isAvailable: boolean = true

						if (
							coupon.couponQuantityType === "limited" &&
							Number(coupon.couponQuantity) <= totalOrderCount
						) {
							isAvailable = false
						}

						// Add expiry validation if isWebUser
						if (isWebUser(roleId)) {
							const now = new Date()
							if (coupon.expiryDate && new Date(coupon.expiryDate) < now) {
								isAvailable = false
							}
						}

						return {
							...coupon,
							isAvailable,
							user: coupon.userId ? userMap.get(coupon.userId) : null,
							couponTags: couponTagMap.get(coupon.couponId) || []
						}
					})

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
