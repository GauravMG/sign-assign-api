import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {isWebUser} from "../types/auth"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class OrderController {
	private commonModelOrder
	private commonModelOrderProduct
	private commonModelProduct
	private commonModelProductMedia
	private commonModelTransaction

	private idColumnOrder: string = "orderId"
	private idColumnOrderProduct: string = "orderProductId"
	private idColumnProduct: string = "productId"
	private idColumnProductMedia: string = "productMediaId"
	private idColumnTransaction: string = "transactionId"

	constructor() {
		this.commonModelOrder = new CommonModel("Order", this.idColumnOrder, [
			"referenceNumber",
			"orderStatus",
			"paymentStatus"
		])
		this.commonModelOrderProduct = new CommonModel(
			"OrderProduct",
			this.idColumnOrderProduct,
			[]
		)
		this.commonModelProduct = new CommonModel("Product", this.idColumnProduct, [
			"name",
			"sku",
			"shortDescription",
			"description",
			"specification",
			"features"
		])
		this.commonModelProductMedia = new CommonModel(
			"ProductMedia",
			this.idColumnProductMedia,
			[]
		)
		this.commonModelTransaction = new CommonModel(
			"Transaction",
			this.idColumnTransaction,
			[]
		)

		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
	}

	public async list(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			let mandatoryFilters: any = {}
			if (isWebUser(roleId)) {
				mandatoryFilters = {
					...mandatoryFilters,
					status: true,
					userId
				}
			}

			const {filter, range, sort, linkedEntities} = await listAPIPayload(
				req.body
			)

			const [orders, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [orders, total] = await Promise.all([
						this.commonModelOrder.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							range,
							sort
						}),

						this.commonModelOrder.list(transaction, {
							filter: {
								...mandatoryFilters,
								...filter
							},
							isCountOnly: true
						})
					])

					if (linkedEntities) {
						const orderIds: number[] = orders.map(({orderId}) => orderId)

						let filterOrderProduct: any = {
							orderId: orderIds
						}
						if ([true, false].indexOf(filter?.status) >= 0) {
							filterOrderProduct = {
								...filterOrderProduct,
								status: filter.status
							}
						}

						let filterTransaction: any = {
							orderId: orderIds
						}
						if ([true, false].indexOf(filter?.status) >= 0) {
							filterTransaction = {
								...filterTransaction,
								status: filter.status
							}
						}

						const [orderProducts, orderTransactions] = await Promise.all([
							this.commonModelOrderProduct.list(transaction, {
								filter: {
									...filterOrderProduct
								},
								range: {
									all: true
								}
							}),

							this.commonModelTransaction.list(transaction, {
								filter: {
									...filterTransaction
								},
								range: {
									all: true
								}
							})
						])

						const productIds: number[] = orderProducts.map((orderProduct) =>
							Number(orderProduct.productId)
						)

						let filterProduct: any = {
							productId: productIds
						}
						if ([true, false].indexOf(filter?.status) >= 0) {
							filterProduct = {
								...filterProduct,
								status: filter.status
							}
						}
						let filterProductMedia: any = {
							productId: productIds
						}
						if ([true, false].indexOf(filter?.status) >= 0) {
							filterProductMedia = {
								...filterProductMedia,
								status: filter.status
							}
						}
						const [products, productMedias] = await Promise.all([
							this.commonModelProduct.list(transaction, {
								filter: {
									...filterProduct
								},
								range: {
									all: true
								}
							}),

							this.commonModelProductMedia.list(transaction, {
								filter: {
									...filterProductMedia
								},
								range: {
									all: true
								}
							})
						])

						const productMediaMap = new Map<number, any[]>()
						for (const productMedia of productMedias) {
							const productMediaGroup =
								productMediaMap.get(productMedia.productId) || []
							productMediaGroup.push(productMedia)
							productMediaMap.set(productMedia.productId, productMediaGroup)
						}

						const productMap = new Map(
							products.map((product) => [
								product.productId,
								{
									...product,
									productMedias: productMediaMap.get(product.productId) || []
								}
							])
						)

						const orderProductMap = orderProducts.reduce(
							(acc, orderProduct) => {
								acc[orderProduct.orderId] = acc[orderProduct.orderId] || []
								acc[orderProduct.orderId].push({
									...orderProduct,
									product: productMap.get(orderProduct.productId)
								})
								return acc
							},
							{}
						)

						const orderTransactionMap = orderTransactions.reduce(
							(acc, orderTransaction) => {
								acc[orderTransaction.orderId] =
									acc[orderTransaction.orderId] || []
								acc[orderTransaction.orderId].push(orderTransaction)
								return acc
							},
							{}
						)

						orders = orders.map((order) => ({
							...order,
							orderProducts: orderProductMap[order.orderId] || [],
							transaction: (orderTransactionMap[order.orderId] || []).pop()
						}))
					}

					return [orders, total]
				}
			)

			return response.successResponse({
				message: `Orders data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: orders
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {orderId, ...restPayload} = req.body

			const [order] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingOrder] = await this.commonModelOrder.list(
						transaction,
						{
							filter: {
								orderId
							}
						}
					)
					if (!existingOrder) {
						throw new BadRequestException("Order doesn't exist")
					}

					// update
					await this.commonModelOrder.updateById(
						transaction,
						restPayload,
						orderId,
						userId
					)

					// get updated details
					const [order] = await this.commonModelOrder.list(transaction, {
						filter: {
							orderId
						}
					})

					return [order]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: order
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new OrderController()
