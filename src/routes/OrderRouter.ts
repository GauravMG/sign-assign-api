import express, {Router} from "express"

import OrderController from "../controllers/OrderController"

// routes
export class OrderRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/list", OrderController.list)
			.post("/update", OrderController.update)
	}
}
