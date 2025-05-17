import express, {Router} from "express"

import ProductController from "../controllers/ProductController"

// routes
export class ProductRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", ProductController.create)
			.post("/list", ProductController.list)
			.post("/update", ProductController.update)
			.post("/delete", ProductController.delete)
	}
}
