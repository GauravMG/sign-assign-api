import OpenAI from "openai"

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY as string
})

export async function getOpenAIResponse(
	userInput: string,
	referenceContext: string[]
): Promise<string> {
	try {
		const completion = await openai.chat.completions.create({
			model: "gpt-4",
			messages: [
				{
					role: "user",
					content: `You are a helpful assistant chatbot that helps users with product queries, orders, and general questions. Generate a small and concise reply to <USER QUERY>${referenceContext?.length ? " based on the <REFERENCE CONTEXT>" : ""}\n<USER QUERY>${userInput}<USER QUERY>${referenceContext?.length ? `\n<REFERENCE CONTEXT>\n- ${referenceContext.join("\n- ")}\n<REFERENCE CONTEXT>` : ""}`
				}
			],
			temperature: 0.7,
			max_completion_tokens: 200
		})

		const message = completion.choices?.[0]?.message?.content?.trim()

		return message || "Sorry, I couldn’t process that. Please try again."
	} catch (error) {
		console.error("OpenAI Error:", error)
		return "Sorry, something went wrong while contacting OpenAI."
	}
}
