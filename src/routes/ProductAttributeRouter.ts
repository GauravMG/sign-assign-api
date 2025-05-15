import express, {Router} from "express"

import ProductAttributeController from "../controllers/ProductAttributeController"

// routes
export class ProductAttributeRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", ProductAttributeController.create)
			.post("/list", ProductAttributeController.list)
			.post("/update", ProductAttributeController.update)
			.post("/delete", ProductAttributeController.delete)
	}
}
