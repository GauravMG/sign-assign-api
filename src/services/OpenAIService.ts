import OpenAI from "openai"
import {ChatCompletionMessageParam} from "openai/resources/chat"

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY as string
})

// export async function getOpenAIResponse(
// 	userInput: string,
// 	referenceContext: string[]
// ): Promise<string> {
// 	try {
// 		const completion = await openai.chat.completions.create({
// 			model: "gpt-4",
// 			messages: [
// 				{
// 					role: "user",
// 					content: `You are a helpful assistant chatbot that helps users with product queries, orders, and general questions. Generate a small and concise reply to <USER QUERY>${referenceContext?.length ? " based on the <REFERENCE CONTEXT>" : ""}\n<USER QUERY>${userInput}<USER QUERY>${referenceContext?.length ? `\n<REFERENCE CONTEXT>\n- ${referenceContext.join("\n- ")}\n<REFERENCE CONTEXT>` : ""}`
// 				}
// 			],
// 			temperature: 0.7,
// 			max_tokens: 50
// 		})

// 		const message = completion.choices?.[0]?.message?.content?.trim()

// 		return message || "Sorry, I couldn’t process that. Please try again."
// 	} catch (error) {
// 		console.error("OpenAI Error:", error)
// 		return "Sorry, something went wrong while contacting OpenAI."
// 	}
// }

async function generateChatCompletion(
	messages: Array<ChatCompletionMessageParam>
): Promise<string> {
	try {
		const completion = await openai.chat.completions.create({
			model: "gpt-4",
			messages,
			temperature: 0.7,
			max_tokens: 100
		})

		const message = completion.choices?.[0]?.message?.content?.trim()
		return message || "Sorry, I couldn’t process that. Please try again."
	} catch (error) {
		console.error("OpenAI Error:", error)
		throw new Error("Sorry, something went wrong while contacting OpenAI.")
	}
}

export async function generateResponseForGeneralInquiry(
	userInput: string,
	referenceContext: string[]
): Promise<string> {
	try {
		const messages: Array<ChatCompletionMessageParam> = [
			{
				role: "system",
				content:
					"You are a helpful assistant chatbot that helps users with product queries, orders, and general questions. Keep your replies concise and user-friendly."
			},
			{
				role: "user",
				content: referenceContext.length
					? `User query: ${userInput}\nReference context:\n- ${referenceContext.join("\n- ")}`
					: `User query: ${userInput}`
			}
		]

		return await generateChatCompletion(messages)
	} catch (error: any) {
		console.error("OpenAI Error:", error)
		return (
			error.message ?? "Sorry, something went wrong while contacting OpenAI."
		)
	}
}

export async function generateResponseForOrderNotFound(
	userInput: string
): Promise<string> {
	try {
		const messages: Array<ChatCompletionMessageParam> = [
			{
				role: "system",
				content:
					"You are a helpful assistant chatbot that helps users with product queries, orders, and general questions. Keep your replies concise and user-friendly. User inquired about his order. But order but provided order id doesn't exists in the system. Reply to the user."
			},
			{
				role: "user",
				content: `Order ID: ${userInput}`
			}
		]

		return await generateChatCompletion(messages)
	} catch (error: any) {
		console.error("OpenAI Error:", error)
		return (
			error.message ?? "Sorry, something went wrong while contacting OpenAI."
		)
	}
}

export async function generateResponseForOrder(
	userInput: string,
	referenceContext: string
): Promise<string> {
	try {
		const messages: Array<ChatCompletionMessageParam> = [
			{
				role: "system",
				content:
					"You are a helpful assistant chatbot that helps users with product queries, orders, and general questions. Keep your replies concise and user-friendly. User inquired about his order. Reply to the user based on provided order data."
			},
			{
				role: "user",
				content: `Order ID: ${userInput}\nOrder data:\n${referenceContext}`
			}
		]

		return await generateChatCompletion(messages)
	} catch (error: any) {
		console.error("OpenAI Error:", error)
		return (
			error.message ?? "Sorry, something went wrong while contacting OpenAI."
		)
	}
}
