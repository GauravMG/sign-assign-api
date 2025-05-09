import express, {Router} from "express"

import SuuportTicketController from "../controllers/SuuportTicketController"

// routes
export class SupportTicketRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", SuuportTicketController.create)
			.post("/list", SuuportTicketController.list)
			.post("/update", SuuportTicketController.update)
			.post("/delete", SuuportTicketController.delete)
	}
}
