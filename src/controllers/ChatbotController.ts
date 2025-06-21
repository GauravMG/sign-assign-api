import {NextFunction, Request, Response} from "express"

import {getLinkFromName, listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

const userStates = new Map<string, any>()

class ChatbotController {
	private commonModelChatSession
	private commonModelChatMessage
	private commonModelProductCategory
	private commonModelProductSubCategory
	private commonModelProduct

	private idColumnChatSession: string = "chatSessionId"
	private idColumnChatMessage: string = "chatMessageId"
	private idColumnProductCategory: string = "productCategoryId"
	private idColumnProductSubCategory: string = "productSubCategoryId"
	private idColumnProduct: string = "productId"

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

		this.chat = this.chat.bind(this)
	}

	public async chat(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {chatsessionid, chatuserid}: Headers = req.headers

			const {input} = req.body

			const [botResponse] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// Create or fetch session
					let [chatSession] = await this.commonModelChatSession.list(
						transaction,
						{
							filter: {
								sessionId: chatsessionid
							},
							// customFilters: [
							// 	{
							// 		OR: [{userId: chatuserid}, {sessionId: chatsessionid}]
							// 	}
							// ],
							range: {
								page: 1,
								pageSize: 1
							}
						}
					)
					if (!chatSession) {
						const [newChatSession] =
							await this.commonModelChatSession.bulkCreate(transaction, [
								{
									sessionId: chatsessionid,
									userId: chatuserid
								}
							])

						chatSession = newChatSession
					}

					// Save USER message
					await this.commonModelChatMessage.bulkCreate(transaction, [
						{
							chatSessionId: chatSession.chatSessionId,
							messageSender: "user",
							message: input
						}
					])

					const stateKey = chatSession.chatSessionId
					let state = userStates.get(stateKey) || {step: "init"}

					let botResponse: any = {}
					switch (state.step) {
						case "init":
							if (input === "look_products") {
								const productCategories =
									await this.commonModelProductCategory.list(transaction, {
										filter: {
											status: true
										},
										range: {all: true},
										sort: [
											{
												orderBy: "name",
												orderDir: "asc"
											}
										]
									})
								state.step = "product_category"
								botResponse = {
									message: "What category are you looking for?",
									options: productCategories.map((productCategory) => ({
										label: productCategory.name,
										value: productCategory.name
									}))
								}
							} else if (input === "check_order") {
								state.step = "order_check"
								botResponse = {message: "Please enter your order ID."}
							}
							break

						case "product_category":
							const [productCategoryByInput] =
								await this.commonModelProductCategory.list(transaction, {
									filter: {
										name: input
									}
								})
							const productSubCategories =
								await this.commonModelProductSubCategory.list(transaction, {
									filter: {
										status: true,
										productCategoryId: Number(
											productCategoryByInput.productCategoryId
										)
									},
									range: {all: true},
									sort: [
										{
											orderBy: "name",
											orderDir: "asc"
										}
									]
								})
							state.category = input
							state.step = "product_sub_category"
							botResponse = {
								message: "What sub-category are you looking for?",
								options: productSubCategories.map((productSubCategory) => ({
									label: productSubCategory.name,
									value: productSubCategory.name
								}))
							}
							break

						case "product_sub_category":
							const [[productCategoryByState], [productSubCategoryByInput]] =
								await Promise.all([
									this.commonModelProductCategory.list(transaction, {
										filter: {
											name: state.category
										}
									}),

									this.commonModelProductSubCategory.list(transaction, {
										filter: {
											name: input
										}
									})
								])
							const products = await this.commonModelProduct.list(transaction, {
								filter: {
									productCategoryId: Number(
										productCategoryByState.productCategoryId
									),
									productSubCategoryId: Number(
										productSubCategoryByInput.productSubCategoryId
									)
								},
								range: {
									page: 1,
									pageSize: 3
								}
							})
							state.subCategory = input
							state.step = "suggestion"
							botResponse = {
								message: "Here are some product suggestions:",
								products: products.map((product) => ({
									name: product.name,
									link: `/product/${getLinkFromName(product.name)}`
								}))
							}
							break

						case "order_check":
							botResponse = {
								message: `Order ID ${input} is in transit! Anything else I can help with?`,
								options: [
									{label: "Look for Products", value: "look_products"},
									{label: "Check my Order", value: "check_order"}
								]
							}
							state = {step: "init"} // Reset
							break

						default:
							state = {step: "init"}
							botResponse = {
								message: "Let's start again. Choose an option:",
								options: [
									{label: "Look for Products", value: "look_products"},
									{label: "Check my Order", value: "check_order"}
								]
							}
					}

					userStates.set(stateKey, state)

					// Save BOT message
					await this.commonModelChatMessage.bulkCreate(transaction, [
						{
							chatSessionId: chatSession.chatSessionId,
							messageSender: "bot",
							message: botResponse.message
						}
					])

					return [botResponse]
				}
			)

			return response.successResponse({
				message: `Chat message`,
				data: botResponse
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new ChatbotController()
