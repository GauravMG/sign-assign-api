import express, {Router} from "express"

import ProductSubCategoryController from "../controllers/ProductSubCategoryController"

// routes
export class ProductSubCategoryRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", ProductSubCategoryController.create)
			.post("/list", ProductSubCategoryController.list)
			.post("/update", ProductSubCategoryController.update)
			.post("/delete", ProductSubCategoryController.delete)
	}
}
