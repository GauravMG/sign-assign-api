import express, {Router} from "express"

import controller from "../controllers/SupportTicketMediaController"

// routes
export class SupportTicketMediaRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", controller.create)
			.post("/list", controller.list)
			.post("/update", controller.update)
			.post("/delete", controller.delete)
	}
}
