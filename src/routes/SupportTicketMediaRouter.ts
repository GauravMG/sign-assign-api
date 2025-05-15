import express, {Router} from "express"

import SupportTicketMediaController from "../controllers/SupportTicketMediaController"

// routes
export class SupportTicketMediaRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", SupportTicketMediaController.create)
			.post("/list", SupportTicketMediaController.list)
			.post("/update", SupportTicketMediaController.update)
			.post("/delete", SupportTicketMediaController.delete)
	}
}
