import express, {Router} from "express"

import BusinessClientController from "../controllers/BusinessClientController"

// routes
export class BusinessClientRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", BusinessClientController.create)
			.post("/list", BusinessClientController.list)
			.post("/update", BusinessClientController.update)
			.post("/delete", BusinessClientController.delete)
	}
}
