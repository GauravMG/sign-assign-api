import OpenAI from "openai"

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY as string
})

export async function getOpenAIResponse(userInput: string): Promise<string> {
	try {
		console.log(`userInput ===`, userInput)
		const completion = await openai.chat.completions.create({
			model: "gpt-4",
			messages: [
				{
					role: "system",
					content:
						"You are a helpful assistant chatbot that helps users with product queries, orders, and general questions."
				},
				{
					role: "user",
					content: userInput
				}
			],
			temperature: 0.7
			// max_tokens: 150
		})
		console.log(`completion ===`, completion)

		const message = completion.choices?.[0]?.message?.content?.trim()
		console.log(`message ===`, message)

		return message || "Sorry, I couldn’t process that. Please try again."
	} catch (error) {
		console.error("OpenAI Error:", error)
		return "Sorry, something went wrong while contacting OpenAI."
	}
}
