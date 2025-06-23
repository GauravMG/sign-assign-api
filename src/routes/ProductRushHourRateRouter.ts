import express, {Router} from "express"

import ProductRushHourRateController from "../controllers/ProductRushHourRateController"

// routes
export class ProductRushHourRateRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/list", ProductRushHourRateController.list)
			.post("/update", ProductRushHourRateController.update)
			.post("/delete", ProductRushHourRateController.delete)
	}
}
