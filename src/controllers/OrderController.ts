import {NextFunction, Request, Response} from "express"
import axios from "axios"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {isWebUser} from "../types/auth"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"
import {createJWTToken} from "../utils/Jwt"

class OrderController {
	private commonModelOrder
	private commonModelOrderProduct
	private commonModelProduct
	private commonModelProductMedia
	private commonModelTransaction
	private commonModelLoginHistory
	private commonModelUser
	private commonModelInvoice

	private idColumnOrder: string = "orderId"
	private idColumnOrderProduct: string = "orderProductId"
	private idColumnProduct: string = "productId"
	private idColumnProductMedia: string = "productMediaId"
	private idColumnTransaction: string = "transactionId"
	private idColumnLoginHistory: string = "loginHistoryId"
	private idColumnUser: string = "userId"
	private idColumnInvoice: string = "invoiceId"

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
		this.commonModelLoginHistory = new CommonModel(
			"LoginHistory",
			this.idColumnLoginHistory,
			[]
		)
		this.commonModelUser = new CommonModel("User", this.idColumnUser, [])
		this.commonModelInvoice = new CommonModel(
			"Invoice",
			this.idColumnInvoice,
			[]
		)

		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
		this.getUserTokenByOrderId = this.getUserTokenByOrderId.bind(this)
		this.updateByAdmin = this.updateByAdmin.bind(this)
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

	public async getUserTokenByOrderId(
		req: Request,
		res: Response,
		next: NextFunction
	) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {orderId} = req.body

			const [jwtToken] = await prisma.$transaction(
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

					const orderUserId: number = existingOrder.userId

					const jwtToken: string = createJWTToken({
						userId: orderUserId
					})

					// create login history
					await this.commonModelLoginHistory.bulkCreate(
						transaction,
						[
							{
								userId: orderUserId,
								jwtToken,
								deviceType: "web"
							}
						],
						orderUserId
					)

					return [jwtToken]
				}
			)

			return response.successResponse({
				message: `JWT Token generated successfully`,
				jwtToken
			})
		} catch (error) {
			next(error)
		}
	}

	public async updateByAdmin(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId}: Headers = req.headers

			let {orderId, amount, cart, amountDetails, newPaymentAmountToPay} =
				req.body
			cart = typeof cart === "string" ? JSON.parse(cart) : cart

			const [user] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const [user] = await this.commonModelUser.list(transaction, {
						filter: {
							userId
						}
					})

					await this.commonModelOrderProduct.softDeleteByFilter(
						transaction,
						{
							orderId
						},
						userId
					)

					return [user]
				}
			)

			let [order, payloadOrderProduct] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					await this.commonModelOrder.updateById(
						transaction,
						{
							userId,
							amount,
							amountDetails:
								typeof amountDetails !== "string"
									? JSON.stringify(amountDetails)
									: amountDetails
						},
						orderId,
						userId
					)

					const payloadOrderProduct = cart.map((el) => ({
						orderId,
						productId: el.productId,
						dataJson: el && typeof el !== "string" ? JSON.stringify(el) : el,
						templateId: el.templateId ? Number(el.templateId) : null,
						design: el.design
							? typeof el.design !== "string"
								? JSON.stringify(el.design)
								: el.design
							: null
					}))
					let orderProducts: any[] = []
					for (let prod of payloadOrderProduct) {
						const [prodRes] = await this.commonModelOrderProduct.bulkCreate(
							transaction,
							[prod],
							userId
						)
						orderProducts.push(prodRes)
					}

					const [updatedOrder] = await this.commonModelOrder.list(transaction, {
						filter: {
							orderId
						}
					})

					return [
						{
							...updatedOrder,
							orderProducts
						},
						payloadOrderProduct
					]
				}
			)

			// if ((newPaymentAmountToPay ?? 0) > 0) {
			// 	const {payload: paymentChargePayload, paymentLink} = await this.createCloverPaymentLink({
			// 		amount: newPaymentAmountToPay,
			// 		orderReferenceNumber: order.referenceNumber,
			// 		receiptEmail: user?.email ?? ""
			// 	})

			// 	await prisma.$transaction(
			// 		async (transaction: PrismaClientTransaction) => {
			// 			let [orderTransaction] = await this.commonModelTransaction.bulkCreate(
			// 				transaction,
			// 				[
			// 					{
			// 						orderId: order.orderId,
			// 						requestDataJson:
			// 							typeof paymentChargePayload !== "string"
			// 								? JSON.stringify(paymentChargePayload)
			// 								: paymentChargePayload
			// 					}
			// 				],
			// 				userId
			// 			)

			// 			return [orderTransaction]
			// 		}
			// 	)

			// 	order = {
			// 		...order,
			// 		additionalResponse: {
			// 			newPaymentAmountToPay,
			// 			paymentLink
			// 		}
			// 	}
			// }

			return response.successResponse({
				message: `Payment data`,
				data: order
			})
		} catch (error: any) {
			next(error)
		}
	}

	public async createCloverPaymentLink({
		amount,
		orderReferenceNumber,
		receiptEmail
	}) {
		const apiKey = process.env.CLOVER_ECOMM_PUBLIC_TOKEN as string
		const url = `https://sandbox.dev.clover.com/v1/charges`

		const payload: any = {
			amount: Math.round(amount * 100),
			currency: "USD",
			external_reference_id: orderReferenceNumber,
			redirect_url: "http://localhost:8080/payment-success"
		}

		if ((receiptEmail ?? "").trim() !== "") {
			payload.receipt_email = receiptEmail
		}

		console.log(`payload ===`, payload)

		try {
			const response = await axios.post(url, payload, {
				headers: {
					"Authorization": `Bearer ${apiKey}`,
					"Content-Type": "application/json"
				}
			})

			console.log("Checkout created:", response.data)
			console.log("Payment Link:", response.data.url)

			return {
				payload,
				paymentLink: response.data.url
			}
		} catch (error: any) {
			console.error(
				"Error creating Clover checkout:",
				error.response?.data || error.message
			)
			throw error
		}
	}
}

export default new OrderController()
