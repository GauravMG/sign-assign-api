import express, {Router} from "express"

import ProductBulkDiscountController from "../controllers/ProductBulkDiscountController"

// routes
export class ProductBulkDiscountRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/list", ProductBulkDiscountController.list)
			.post("/update", ProductBulkDiscountController.update)
			.post("/delete", ProductBulkDiscountController.delete)
	}
}
