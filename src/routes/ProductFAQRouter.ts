import express, {Router} from "express"

import ProductFAQController from "../controllers/ProductFAQController"

// routes
export class ProductFAQRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", ProductFAQController.create)
			.post("/list", ProductFAQController.list)
			.post("/update", ProductFAQController.update)
			.post("/delete", ProductFAQController.delete)
	}
}
