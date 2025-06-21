import express, {Router} from "express"

import ChatbotController from "../controllers/ChatbotController"

// routes
export class ChatbotRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router.post("/chat", ChatbotController.chat)
	}
}
