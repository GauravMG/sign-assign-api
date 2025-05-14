import express, {Router} from "express"

import SupportTicketController from "../controllers/SupportTicketController"

// routes
export class SupportTicketRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", SupportTicketController.create)
			.post("/list", SupportTicketController.list)
			.post("/update", SupportTicketController.update)
			.post("/delete", SupportTicketController.delete)
	}
}
