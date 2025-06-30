import axios from "axios"
import {NextFunction, Request, Response} from "express"

import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import CommonModel from "../models/CommonModel"
import {Headers} from "../types/common"
import {encryptTo8Digits, randomString} from "../helpers"

const CLOVER_ENVIRONMENT_CONSTANTS = {
	production: {
		apiBasePath: "https://scl.clover.com"
	},
	sandbox: {
		apiBasePath: "https://scl-sandbox.dev.clover.com"
	},
	merchantId: process.env.CLOVER_MERCHANT_ID as string,
	ecommPublicToken: process.env.CLOVER_ECOMM_PUBLIC_TOKEN as string,
	ecommPrivateToken: process.env.CLOVER_ECOMM_PRIVATE_TOKEN as string
}

// const CLOVER_API_URL = process.env.CLOVER_ENVIRONMENT === 'production'
//   ? 'https://api.clover.com'
//   : 'https://sandbox.dev.clover.com';

class PaymentController {
	private commonModelUser
	private commonModelOrder
	private commonModelOrderProduct
	private commonModelTransaction

	private idColumnUser: string = "userId"
	private idColumnOrder: string = "orderId"
	private idColumnOrderProduct: string = "orderProductId"
	private idColumnTransaction: string = "transactionId"

	constructor() {
		this.commonModelUser = new CommonModel("User", this.idColumnUser, [])
		this.commonModelOrder = new CommonModel("Order", this.idColumnOrder, [])
		this.commonModelOrderProduct = new CommonModel(
			"OrderProduct",
			this.idColumnOrderProduct,
			[]
		)
		this.commonModelTransaction = new CommonModel(
			"Transaction",
			this.idColumnTransaction,
			[]
		)

		this.create = this.create.bind(this)
	}

	generateUniqueOrderId() {
		// Generate a random 6-digit number
		const randomNum = Math.floor(100000 + Math.random() * 900000)

		// Add a timestamp to ensure uniqueness
		const timestamp = Date.now().toString().slice(-4) // Last 4 digits of timestamp

		// Combine random number and timestamp for a unique ID
		const orderId = `ORD-${randomNum}-${timestamp}`

		return orderId
	}

	public async create(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId}: Headers = req.headers

			let {
				amount,
				sourceToken,
				cart,
				amountDetails,
				shippingAddressId,
				shippingAddressDetails,
				businessClientId
			} = req.body
			cart = typeof cart === "string" ? JSON.parse(cart) : cart

			const orderReferenceNumber: string = `ORD-${encryptTo8Digits(
				`${randomString(6).toUpperCase()}-${userId}`
			)}`

			const cloverApiUrl = `${CLOVER_ENVIRONMENT_CONSTANTS[process.env.CLOVER_ENVIRONMENT as string].apiBasePath}/v1/charges`

			const [user] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const [user] = await this.commonModelUser.list(transaction, {
						filter: {
							userId
						}
					})

					return [user]
				}
			)

			let paymentChargePayload: any = {
				amount: amount * 100, // The amount to charge in the smallest unit of the currency (e.g., cents for USD)
				currency: "USD",
				capture: true,
				description: `Order #${orderReferenceNumber}`,
				external_reference_id: orderReferenceNumber,
				source: sourceToken
			}
			if ((user?.email ?? "").trim() !== "") {
				paymentChargePayload = {
					...paymentChargePayload,
					receipt_email: user.email
				}
			}

			let [order] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [order] = await this.commonModelOrder.bulkCreate(
						transaction,
						[
							{
								userId,
								referenceNumber: orderReferenceNumber,
								createdFor: businessClientId ?? userId,
								amount,
								amountDetails:
									typeof amountDetails !== "string"
										? JSON.stringify(amountDetails)
										: amountDetails,
								shippingAddressId,
								shippingAddressDetails:
									typeof shippingAddressDetails !== "string"
										? JSON.stringify(shippingAddressDetails)
										: shippingAddressDetails
							}
						],
						userId
					)

					const payloadOrderProduct = cart.map((el) => ({
						orderId: order.orderId,
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

					let [orderTransaction] = await this.commonModelTransaction.bulkCreate(
						transaction,
						[
							{
								orderId: order.orderId,
								requestDataJson:
									typeof paymentChargePayload !== "string"
										? JSON.stringify(paymentChargePayload)
										: paymentChargePayload
							}
						],
						userId
					)

					return [
						{
							...order,
							orderProducts,
							transaction: orderTransaction
						}
					]
				}
			)

			const paymentChargeResponse: any = await axios.post(
				cloverApiUrl,
				paymentChargePayload,
				{
					headers: {
						"Authorization": `Bearer ${CLOVER_ENVIRONMENT_CONSTANTS.ecommPrivateToken}`, // API Key used here instead of OAuth token
						"Content-Type": "application/json"
					}
				}
			)

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					await this.commonModelTransaction.updateById(
						transaction,
						{
							responseDataJson:
								typeof paymentChargeResponse.data !== "string"
									? JSON.stringify(paymentChargeResponse.data)
									: paymentChargeResponse.data
						},
						order.transaction.transactionId,
						userId
					)

					const [orderTransaction] = await this.commonModelTransaction.list(
						transaction,
						{
							filter: {
								transactionId: order.transaction.transactionId
							}
						}
					)

					await this.commonModelOrder.updateById(
						transaction,
						{
							paymentStatus: paymentChargeResponse.data.captured
								? "paid"
								: "failed"
						},
						order.orderId,
						userId
					)

					const [updatedOrder] = await this.commonModelOrder.list(transaction, {
						filter: {
							orderId: order.orderId
						}
					})

					order = {
						...order,
						...updatedOrder,
						transaction: orderTransaction
					}

					return [order]
				}
			)

			return response.successResponse({
				message: `Payment data`,
				data: order
			})
		} catch (error: any) {
			next(error)
		}
	}
}

export default new PaymentController()
