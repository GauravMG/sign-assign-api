import {NextFunction, Request, Response} from "express"

import {getLinkFromName} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import CommonModel from "../models/CommonModel"
import {ChromaDBService} from "../services/ChromaDBService"
import {
	generateResponseForGeneralInquiry,
	generateResponseForOrder,
	generateResponseForOrderNotFound
} from "../services/OpenAIService"
import {Headers} from "../types/common"

const collectionName = "website_data"
const chromaDBService: ChromaDBService = new ChromaDBService()

const userStates = new Map<string, any>()

const initialMessageOptions: {
	label: string
	value: string
}[] = [
	{label: "Lookup Products", value: "look_products"},
	{label: "Track My Order", value: "track_my_order"},
	{label: "Ask me anything", value: "ask_anything"},
	{label: "Support", value: "grievance"}
]

function tryParseJSON(input: any): any {
	try {
		return typeof input === "string" ? JSON.parse(input) : input
	} catch (e) {
		return input // return original if parse fails
	}
}

class ChatbotController {
	private commonModelChatSession
	private commonModelChatMessage
	private commonModelProductCategory
	private commonModelProductSubCategory
	private commonModelProduct
	private commonModelProductAttribute
	private commonModelAttribute
	private commonModelSupportTicket
	private commonModelOrder

	private idColumnChatSession: string = "chatSessionId"
	private idColumnChatMessage: string = "chatMessageId"
	private idColumnProductCategory: string = "productCategoryId"
	private idColumnProductSubCategory: string = "productSubCategoryId"
	private idColumnProduct: string = "productId"
	private idColumnProductAtribute: string = "productAttributeId"
	private idColumnAttribute: string = "attributeId"
	private idColumnSupportTicket: string = "supportTicketId"
	private idColumnOrder: string = "orderId"

	constructor() {
		this.commonModelChatSession = new CommonModel(
			"ChatSession",
			this.idColumnChatSession,
			[]
		)
		this.commonModelChatMessage = new CommonModel(
			"ChatMessage",
			this.idColumnChatMessage,
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
		this.commonModelProductAttribute = new CommonModel(
			"ProductAttribute",
			this.idColumnProductAtribute,
			[]
		)
		this.commonModelAttribute = new CommonModel(
			"Attribute",
			this.idColumnAttribute,
			[]
		)
		this.commonModelSupportTicket = new CommonModel(
			"SupportTicket",
			this.idColumnSupportTicket,
			["subject", "description"]
		)
		this.commonModelOrder = new CommonModel("Order", this.idColumnOrder, [
			"referenceNumber",
			"orderStatus",
			"paymentStatus"
		])

		this.chat = this.chat.bind(this)
	}

	public async chat(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {chatsessionid, chatuserid}: Headers = req.headers

			const {input} = req.body

			let isAIType: boolean = false
			let chatSessionData: any = null
			const parsedInput = tryParseJSON(input)

			let [botResponse] = await prisma.$transaction(async (transaction) => {
				// --- Chat Session Setup ---
				let [chatSession] = await this.commonModelChatSession.list(
					transaction,
					{
						filter: {sessionId: chatsessionid},
						range: {page: 1, pageSize: 1}
					}
				)

				if (!chatSession) {
					;[chatSession] = await this.commonModelChatSession.bulkCreate(
						transaction,
						[{sessionId: chatsessionid, userId: chatuserid}]
					)
				}

				// --- Save User Message ---
				await this.commonModelChatMessage.bulkCreate(transaction, [
					{
						chatSessionId: chatSession.chatSessionId,
						messageSender: "user",
						message:
							typeof input === "object"
								? JSON.stringify(input)
								: input.toString()
					}
				])

				chatSessionData = chatSession
				const stateKey = chatSession.chatSessionId
				let state = userStates.get(stateKey) || {step: "init"}

				let botResponse: any = {}

				const generateBotMessage = async (state) => {
					let isAIType: boolean = false
					let botResponse: any = {}
					let isRecall: boolean = false

					switch (state.step) {
						case "init":
							state.currentAttributeIndex = 0
							state.selectedAttributes = {}
							state.attributesToAsk = []

							if (
								typeof parsedInput === "object" &&
								parsedInput.type === "grievance"
							) {
								state = {step: "init"}

								await this.commonModelSupportTicket.bulkCreate(
									transaction,
									[
										{
											userName: parsedInput.name,
											userEmail: parsedInput.email,
											userMobile: parsedInput.mobile,
											subject: parsedInput.subject,
											description: parsedInput.message
										}
									],
									chatuserid
								)

								botResponse = {
									message:
										"Thank you! Your grievance has been submitted. We'll get back to you shortly."
								}
								break
							}
							if (
								typeof parsedInput === "object" &&
								parsedInput.type === "track_my_order"
							) {
								isAIType = true
								break
							}
							if (input === "look_products") {
								const checkProducts = await this.commonModelProduct.list(
									transaction,
									{
										filter: {
											status: true
										},
										range: {
											all: true
										}
									}
								)
								const additionalProductCategoryFilter = {
									productCategoryId: checkProducts.map(
										(product) => product.productCategoryId
									)
								}
								const productCategories =
									await this.commonModelProductCategory.list(transaction, {
										filter: {status: true, ...additionalProductCategoryFilter},
										range: {all: true},
										sort: [{orderBy: "name", orderDir: "asc"}]
									})
								state.step = "product_category"
								botResponse = {
									message: "What category are you looking for?",
									options: productCategories.map((pc) => ({
										label: pc.name,
										value: pc.productCategoryId
									}))
								}
							} else {
								isAIType = true
								state = {step: "init"}
							}
							break

						case "product_category":
							state.category = input
							const checkProducts = await this.commonModelProduct.list(
								transaction,
								{
									filter: {
										status: true
									},
									range: {
										all: true
									}
								}
							)
							const additionalProductSubCategoryFilter = {
								productSubCategoryId: checkProducts.map(
									(product) => product.productSubCategoryId
								)
							}
							const subCategories =
								await this.commonModelProductSubCategory.list(transaction, {
									filter: {
										status: true,
										productCategoryId: Number(input),
										...additionalProductSubCategoryFilter
									},
									range: {all: true},
									sort: [{orderBy: "name", orderDir: "asc"}]
								})
							state.step = "product_sub_category"
							botResponse = {
								message: "What sub-category are you looking for?",
								options: subCategories.map((sc) => ({
									label: sc.name,
									value: sc.productSubCategoryId
								}))
							}
							break

						case "product_sub_category":
							state.subCategory = input

							isRecall = true
							state.step = "final_product_suggestions"

							break

						// state.currentAttributeIndex = state.currentAttributeIndex ?? 0
						// state.selectedAttributes = {}
						// state.attributesToAsk = []

						// const products = await this.commonModelProduct.list(transaction, {
						// 	filter: {
						// 		productCategoryId: Number(state.category),
						// 		productSubCategoryId: Number(input)
						// 	},
						// 	range: {all: true}
						// })
						// const productIds = products.map((p) => p.productId)
						// const productAttributes =
						// 	await this.commonModelProductAttribute.list(transaction, {
						// 		filter: {productId: productIds},
						// 		range: {all: true}
						// 	})
						// if (!productAttributes?.length) {
						// 	isRecall = true
						// 	state.step = "final_product_suggestions"

						// 	break
						// }
						// const attributeIds = productAttributes.map((pa) => pa.attributeId)
						// const attributes = await this.commonModelAttribute.list(
						// 	transaction,
						// 	{
						// 		filter: {attributeId: attributeIds},
						// 		range: {
						// 			page: 1,
						// 			pageSize: 1
						// 		}
						// 	}
						// )
						// if (!attributes?.length) {
						// 	isRecall = true
						// 	state.step = "final_product_suggestions"

						// 	break
						// }
						// state.attributesToAsk = attributes.map((attr) => ({
						// 	attributeId: attr.attributeId,
						// 	name: attr.name,
						// 	options: attr.options ? JSON.parse(attr.options) : []
						// }))
						// const currentAttr =
						// 	state.attributesToAsk[state.currentAttributeIndex]
						// state.step =
						// 	state.attributesToAsk.length > 0
						// 		? "filter_attribute_answer"
						// 		: "final_product_suggestions"
						// botResponse = {
						// 	message: `Please select a ${currentAttr.name}`,
						// 	options: currentAttr.options.map((opt) => ({
						// 		label: opt,
						// 		value: opt
						// 	}))
						// }
						// break

						// case "filter_attribute_answer":
						// 	state.selectedAttributes[
						// 		state.attributesToAsk[state.currentAttributeIndex].attributeId
						// 	] = input
						// 	state.currentAttributeIndex += 1
						// 	if (state.currentAttributeIndex < state.attributesToAsk.length) {
						// 		const attr = state.attributesToAsk[state.currentAttributeIndex]
						// 		botResponse = {
						// 			message: `Please select a ${attr.name}`,
						// 			options: attr.options.map((opt) => ({label: opt, value: opt}))
						// 		}
						// 		state.step = "filter_attribute_answer"
						// 	} else {
						// 		isRecall = true
						// 		state.step = "final_product_suggestions"
						// 	}
						// 	break

						case "final_product_suggestions":
							// let productAttrs: any[] = []
							// if (
							// 	state.selectedAttributes &&
							// 	Object.keys(state.selectedAttributes).length
							// ) {
							// 	state.selectedAttributes[
							// 		state.attributesToAsk[
							// 			state.currentAttributeIndex - 1
							// 		].attributeId
							// 	] = input

							// 	const selectedAttributesPayload = Object.entries(
							// 		state.selectedAttributes
							// 	).map(([attributeId, value]) => ({
							// 		attributeId: Number(attributeId),
							// 		value
							// 	}))

							// 	productAttrs = await this.commonModelProductAttribute.list(
							// 		transaction,
							// 		{
							// 			customFilters: [
							// 				{
							// 					OR: selectedAttributesPayload
							// 				}
							// 			],
							// 			range: {all: true}
							// 		}
							// 	)
							// }
							// const matchingProductIds = productAttrs.map((pa) => pa.productId)
							// const finalProducts = await this.commonModelProduct.list(
							// 	transaction,
							// 	{
							// 		filter: {
							// 			productCategoryId: Number(state.category),
							// 			productSubCategoryId: Number(state.subCategory)
							// 			// productId: matchingProductIds?.length
							// 			// 	? matchingProductIds
							// 			// 	: undefined
							// 		},
							// 		range: {page: 1, pageSize: 3}
							// 	}
							// )
							// if (!finalProducts?.length) {
							// 	state.step = "init"
							// 	botResponse = {
							// 		message:
							// 			"I’m sorry, but we couldn’t find anything based on your search. If you’d like help finding something similar, feel free to call us at +1 972-418-5253 or email orders@signassign.com — we’re happy to assist!",
							// 		products: []
							// 	}
							// 	break
							// }

							// state.step = "init"
							// botResponse = {
							// 	message: "Here are some product suggestions:",
							// 	products: finalProducts.map((p) => ({
							// 		name: p.name,
							// 		link: `/product/${getLinkFromName(p.name)}?pid=${p.productId}`
							// 	}))
							// }
							// break

							const finalProducts = await this.commonModelProduct.list(
								transaction,
								{
									filter: {
										productCategoryId: Number(state.category),
										productSubCategoryId: Number(state.subCategory)
									},
									range: {page: 1, pageSize: 3}
								}
							)

							if (!finalProducts?.length) {
								// No products found → show message and schedule the next question
								state.step = "await_anything_else"

								botResponse = {
									message:
										"I’m sorry, but we couldn’t find anything based on your search.",
									products: [],
									delayNext: {
										message: "Is there anything else I can help you with?",
										options: [
											{label: "Yes", value: "yes_anything_else"},
											{label: "No", value: "no_anything_else"}
										]
									}
								}

								break
							}

							state.step = "await_anything_else"

							botResponse = {
								message: "Here are some product suggestions:",
								products: finalProducts.map((p) => ({
									name: p.name,
									link: `/product/${getLinkFromName(p.name)}?pid=${p.productId}`
								})),
								delayNext: {
									message: "Is there anything else I can help you with?",
									options: [
										{label: "Yes", value: "yes_anything_else"},
										{label: "No", value: "no_anything_else"}
									]
								}
							}

							break

						case "await_anything_else":
							if (input === "yes_anything_else") {
								state.step = "init"
								botResponse = {
									message: "Great! What would you like to do next?",
									options: initialMessageOptions
								}
							} else if (input === "no_anything_else") {
								state.step = "init"
								botResponse = {
									message: "Glad to help!",
									endSession: true // custom key to instruct frontend to close/minimize
								}
							} else {
								state.step = "init"
								botResponse = {
									message: "Let's start again. Choose an option:",
									options: initialMessageOptions
								}
							}
							break

						default:
							state.step = "init"
							botResponse = {
								message: "Hi there! What would you like to do today?",
								options: initialMessageOptions
							}
					}

					return {state, botResponse, isAIType, isRecall}
				}

				let isRecall: boolean = false
				do {
					const generatedBotMessage = await generateBotMessage(state)
					state = generatedBotMessage.state
					botResponse = generatedBotMessage.botResponse
					isAIType = generatedBotMessage.isAIType
					isRecall = generatedBotMessage.isRecall
				} while (isRecall)

				userStates.set(stateKey, state)

				// --- Save Bot Message ---
				if (!isAIType) {
					await this.commonModelChatMessage.bulkCreate(transaction, [
						{
							chatSessionId: chatSession.chatSessionId,
							messageSender: "bot",
							message: botResponse.message
						}
					])

					return [botResponse]
				}

				return []
			})

			if (isAIType) {
				if (parsedInput.type === "track_my_order") {
					const [order] = await prisma.$transaction(async (transaction) => {
						// --- get order details ---
						const [order] = await this.commonModelOrder.list(transaction, {
							filter: {
								referenceNumber: parsedInput.input
							}
						})

						return [order]
					})

					if (!order) {
						// Use OpenAI for unrecognized intent
						const aiReply = await generateResponseForOrderNotFound(
							parsedInput.input
						)
						botResponse = {
							message: aiReply
						}
					} else {
						let orderDataForGPT: string[] = []

						orderDataForGPT.push(`- Order status: ${order.orderStatus}`)
						orderDataForGPT.push(
							`- Shipping address: ${order.shippingAddressDetails}`
						)
						orderDataForGPT.push(`- Created at: ${order.createdAt}`)

						if (order.amountDetails) {
							orderDataForGPT.push(
								`- Overall price data: ${typeof order.amountDetails !== "string" ? JSON.stringify(order.amountDetails) : order.amountDetails}`
							)
						}
						orderDataForGPT.push(`- Payment status: ${order.paymentStatus}`)

						// Use OpenAI for unrecognized intent
						const aiReply = await generateResponseForOrder(
							parsedInput.input,
							orderDataForGPT.join("\n")
						)
						botResponse = {
							message: aiReply
						}
					}
				} else {
					// get similar data from chromadb
					const similarContext = await chromaDBService.queryCollection(
						collectionName,
						{
							queryTexts: [input],
							nResults: 3
						}
					)
					const documents = (similarContext.documents?.[0] || [])
						.map((text) => text ?? "")
						.filter((text) => text.trim() !== "")

					// Use OpenAI for unrecognized intent
					const aiReply = await generateResponseForGeneralInquiry(
						input,
						documents
					)
					botResponse = {
						message: aiReply
					}
				}

				await prisma.$transaction(async (transaction) => {
					// --- Save Bot Message ---
					await this.commonModelChatMessage.bulkCreate(transaction, [
						{
							chatSessionId: chatSessionData.chatSessionId,
							messageSender: "bot",
							message: botResponse.message
						}
					])
				})
			}

			return response.successResponse({
				message: "Chat message",
				data: botResponse
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new ChatbotController()
