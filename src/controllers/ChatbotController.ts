import {NextFunction, Request, Response} from "express"

import {getLinkFromName} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import CommonModel from "../models/CommonModel"
import {getOpenAIResponse} from "../services/OpenAIService"
import {Headers} from "../types/common"

const userStates = new Map<string, any>()

class ChatbotController {
	private commonModelChatSession
	private commonModelChatMessage
	private commonModelProductCategory
	private commonModelProductSubCategory
	private commonModelProduct
	private commonModelProductAttribute
	private commonModelAttribute
	private commonModelSupportTicket

	private idColumnChatSession: string = "chatSessionId"
	private idColumnChatMessage: string = "chatMessageId"
	private idColumnProductCategory: string = "productCategoryId"
	private idColumnProductSubCategory: string = "productSubCategoryId"
	private idColumnProduct: string = "productId"
	private idColumnProductAtribute: string = "productAttributeId"
	private idColumnAttribute: string = "attributeId"
	private idColumnSupportTicket: string = "supportTicketId"

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

		this.chat = this.chat.bind(this)
	}

	public async chat(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)
			const {chatsessionid, chatuserid}: Headers = req.headers
			const {input} = req.body

			const [botResponse] = await prisma.$transaction(async (transaction) => {
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
						message: input
					}
				])

				const stateKey = chatSession.chatSessionId
				let state = userStates.get(stateKey) || {step: "init"}

				let botResponse: any = {}

				switch (state.step) {
					case "init":
						console.log(`input ===`, input)
						function tryParseJSON(input: any): any {
							try {
								return typeof input === "string" ? JSON.parse(input) : input
							} catch (e) {
								return input // return original if parse fails
							}
						}
						const parsedInput = tryParseJSON(input)
						console.log(`parsedInput ===`, parsedInput)
						console.log(`typeof parsedInput ===`, typeof parsedInput)
						console.log(`parsedInput?.type ===`, parsedInput?.type)
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
						if (input === "look_products") {
							const productCategories =
								await this.commonModelProductCategory.list(transaction, {
									filter: {status: true},
									range: {all: true},
									sort: [{orderBy: "name", orderDir: "asc"}]
								})
							state.step = "product_category"
							botResponse = {
								message: "What category are you looking for?",
								options: productCategories.map((pc) => ({
									label: pc.name,
									value: pc.name
								}))
							}
						} else if (input === "check_order") {
							state.step = "order_check"
							botResponse = {message: "Please enter your order ID."}
						} else {
							// Use OpenAI for unrecognized intent
							const aiReply = await getOpenAIResponse(input)
							botResponse = {
								message: aiReply
							}
							state = {step: "init"}
						}
						break

					case "product_category":
						const [category] = await this.commonModelProductCategory.list(
							transaction,
							{
								filter: {name: input}
							}
						)
						const subCategories = await this.commonModelProductSubCategory.list(
							transaction,
							{
								filter: {
									status: true,
									productCategoryId: Number(category.productCategoryId)
								},
								range: {all: true},
								sort: [{orderBy: "name", orderDir: "asc"}]
							}
						)
						state.category = input
						state.step = "product_sub_category"
						botResponse = {
							message: "What sub-category are you looking for?",
							options: subCategories.map((sc) => ({
								label: sc.name,
								value: sc.name
							}))
						}
						break

					case "product_sub_category":
						const [[catStep], [subCatStep]] = await Promise.all([
							this.commonModelProductCategory.list(transaction, {
								filter: {name: state.category}
							}),
							this.commonModelProductSubCategory.list(transaction, {
								filter: {name: input}
							})
						])
						const products = await this.commonModelProduct.list(transaction, {
							filter: {
								productCategoryId: Number(catStep.productCategoryId),
								productSubCategoryId: Number(subCatStep.productSubCategoryId)
							},
							range: {all: true}
						})
						const productIds = products.map((p) => p.productId)
						const productAttributes =
							await this.commonModelProductAttribute.list(transaction, {
								filter: {productId: productIds},
								range: {all: true}
							})
						const attributeIds = productAttributes.map((pa) => pa.attributeId)
						const attributes = await this.commonModelAttribute.list(
							transaction,
							{
								filter: {attributeId: attributeIds},
								range: {all: true}
							}
						)
						state.subCategory = input
						state.currentAttributeIndex = 0
						state.selectedAttributes = {}
						state.attributesToAsk = attributes.map((attr) => ({
							attributeId: attr.attributeId,
							name: attr.name,
							options: attr.options ? JSON.parse(attr.options) : []
						}))
						const currentAttr =
							state.attributesToAsk[state.currentAttributeIndex]
						state.step =
							state.attributesToAsk.length > 0
								? "filter_attribute_answer"
								: "final_product_suggestions"
						botResponse = {
							message: `Please select a ${currentAttr.name}`,
							options: currentAttr.options.map((opt) => ({
								label: opt,
								value: opt
							}))
						}
						break

					case "filter_attribute_answer":
						state.selectedAttributes[
							state.attributesToAsk[state.currentAttributeIndex].attributeId
						] = input
						state.currentAttributeIndex += 1
						if (
							state.currentAttributeIndex <
							state.attributesToAsk.length - 1
						) {
							const attr = state.attributesToAsk[state.currentAttributeIndex]
							botResponse = {
								message: `Please select a ${attr.name}`,
								options: attr.options.map((opt) => ({label: opt, value: opt}))
							}
							state.step = "filter_attribute_answer"
						} else {
							const attr = state.attributesToAsk[state.currentAttributeIndex]
							botResponse = {
								message: `Please select a ${attr.name}`,
								options: attr.options.map((opt) => ({label: opt, value: opt}))
							}
							state.step = "final_product_suggestions"
						}
						break

					case "final_product_suggestions":
						state.selectedAttributes[
							state.attributesToAsk[state.currentAttributeIndex - 1].attributeId
						] = input
						const selectedAttributesPayload = Object.entries(
							state.selectedAttributes
						).map(([attributeId, value]) => ({
							attributeId: Number(attributeId),
							value
						}))
						const [[cat], [subCat], productAttrs] = await Promise.all([
							this.commonModelProductCategory.list(transaction, {
								filter: {name: state.category}
							}),
							this.commonModelProductSubCategory.list(transaction, {
								filter: {name: state.subCategory}
							}),
							this.commonModelProductAttribute.list(transaction, {
								customFilters: [
									{
										OR: selectedAttributesPayload
									}
								],
								range: {all: true}
							})
						])
						const matchingProductIds = productAttrs.map((pa) => pa.productId)
						const finalProducts = matchingProductIds.length
							? await this.commonModelProduct.list(transaction, {
									filter: {
										productCategoryId: Number(cat.productCategoryId),
										productSubCategoryId: Number(subCat.productSubCategoryId),
										productId: matchingProductIds
									},
									range: {page: 1, pageSize: 3}
								})
							: []

						state.step = "init"
						botResponse = {
							message: "Here are some product suggestions:",
							products: finalProducts.map((p) => ({
								name: p.name,
								link: `/product/${getLinkFromName(p.name)}`
							}))
						}
						break

					case "order_check":
						botResponse = {
							message: `Order ID ${input} is in transit! Anything else I can help with?`,
							options: [
								{label: "Look for Products", value: "look_products"},
								{label: "Ask me anything", value: "ask_anything"},
								{label: "Grievance", value: "grievance"}
							]
						}
						state = {step: "init"}
						break

					default:
						state = {step: "init"}
						botResponse = {
							message: "Let's start again. Choose an option:",
							options: [
								{label: "Look for Products", value: "look_products"},
								{label: "Ask me anything", value: "ask_anything"},
								{label: "Grievance", value: "grievance"}
							]
						}
				}
				console.log(`stateKey ===`, stateKey)
				console.log(`state ===`, state)
				console.log(`botResponse ===`, botResponse)

				userStates.set(stateKey, state)

				// --- Save Bot Message ---
				await this.commonModelChatMessage.bulkCreate(transaction, [
					{
						chatSessionId: chatSession.chatSessionId,
						messageSender: "bot",
						message: botResponse.message
					}
				])

				return [botResponse]
			})

			return response.successResponse({
				message: "Chat message",
				data: botResponse
			})
		} catch (error) {
			next(error)
		}
	}

	public async chatB1(req: Request, res: Response, next: NextFunction) {
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
							const [productCategoryStepProductCategory] =
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
											productCategoryStepProductCategory.productCategoryId
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
							const [
								[productCategoryStepProductSubCategory],
								[productSubCategoryStepProductSubCategory]
							] = await Promise.all([
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
							const productsStepProductSubCategory =
								await this.commonModelProduct.list(transaction, {
									filter: {
										productCategoryId: Number(
											productCategoryStepProductSubCategory.productCategoryId
										),
										productSubCategoryId: Number(
											productSubCategoryStepProductSubCategory.productSubCategoryId
										)
									},
									range: {all: true}
								})
							const productIds: number[] = productsStepProductSubCategory.map(
								(product) => product.productId
							)
							const productAttributes =
								await this.commonModelProductAttribute.list(transaction, {
									filter: {
										productId: productIds
									},
									range: {all: true}
								})
							const attributeIds: number[] = productAttributes.map(
								(productAttribute) => productAttribute.attributeId
							)
							const attributes = await this.commonModelAttribute.list(
								transaction,
								{
									filter: {
										attributeId: attributeIds
									},
									range: {all: true}
								}
							)
							state.subCategory = input
							state.currentAttributeIndex = 0
							state.selectedAttributes = {}
							state.attributesToAsk = attributes.map((attr) => ({
								attributeId: attr.attributeId,
								name: attr.name,
								options: attr.options ? JSON.parse(attr.options) : null
							}))
							if (
								state.currentAttributeIndex <
								state.attributesToAsk.length - 1
							) {
								state.step = "filter_attribute_answer"
							} else {
								state.step = "final_product_suggestions"
							}
							const attrStepProductSubCategory =
								state.attributesToAsk[state.currentAttributeIndex]
							botResponse = {
								message: `Please select a ${attrStepProductSubCategory.name}`,
								options: attrStepProductSubCategory.options.map((opt) => ({
									label: opt,
									value: opt
								}))
							}
							break

						case "filter_attribute_answer":
							state.currentAttributeIndex += 1

							const currentAttr =
								state.attributesToAsk[state.currentAttributeIndex]
							state.selectedAttributes[currentAttr.attributeId] = input

							if (
								state.currentAttributeIndex <
								state.attributesToAsk.length - 1
							) {
								state.step = "filter_attribute_answer"
							} else {
								state.step = "final_product_suggestions"
							}
							state.selectedAttributes = {
								...state.selectedAttributes,
								[state.attributesToAsk[state.currentAttributeIndex - 1]
									.attributeId]: input
							}
							const attrStepFilterAttributeAnswer =
								state.attributesToAsk[state.currentAttributeIndex]
							botResponse = {
								message: `Please select a ${attrStepFilterAttributeAnswer.name}`,
								options: attrStepFilterAttributeAnswer.options.map((opt) => ({
									label: opt,
									value: opt
								}))
							}
							break

						case "final_product_suggestions":
							state.currentAttributeIndex += 1
							state.selectedAttributes = {
								...state.selectedAttributes,
								[state.attributesToAsk[state.currentAttributeIndex - 1]
									.attributeId]: input
							}
							const selectedAttributesPayload = Object.keys(
								state.selectedAttributes
							).map((selectedAttribute) => ({
								attributeId: Number(selectedAttribute),
								value: state.selectedAttributes[selectedAttribute]
							}))
							const [
								[productCategoryStepFinalProductSuggestions],
								[productSubCategoryStepFinalProductSuggestions],
								productAttributesStepFinalProductSuggestions
							] = await Promise.all([
								this.commonModelProductCategory.list(transaction, {
									filter: {
										name: state.category
									}
								}),

								this.commonModelProductSubCategory.list(transaction, {
									filter: {
										name: state.subCategory
									}
								}),

								this.commonModelProductAttribute.list(transaction, {
									customFilters: [
										{
											OR: [
												...selectedAttributesPayload.map(
													({attributeId, value}) => ({
														attributeId,
														value
													})
												)
											]
										}
									],
									range: {all: true}
								})
							])
							const products =
								productAttributesStepFinalProductSuggestions?.length
									? await this.commonModelProduct.list(transaction, {
											filter: {
												productCategoryId: Number(
													productCategoryStepFinalProductSuggestions.productCategoryId
												),
												productSubCategoryId: Number(
													productSubCategoryStepFinalProductSuggestions.productSubCategoryId
												),
												productId:
													productAttributesStepFinalProductSuggestions.map(
														(productAttributesStepFinalProductSuggestion) =>
															productAttributesStepFinalProductSuggestion.productId
													)
											},
											range: {
												page: 1,
												pageSize: 3
											}
										})
									: []
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
									{label: "Look for Products", value: "look_products"}
									// {label: "Check my Order", value: "check_order"}
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
