import express, {Router} from "express"

import ProductCategoryController from "../controllers/ProductCategoryController"

// routes
export class ProductCategoryRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", ProductCategoryController.create)
			.post("/list", ProductCategoryController.list)
			.post("/update", ProductCategoryController.update)
			.post("/delete", ProductCategoryController.delete)
	}
}
