import express, {Router} from "express"

import UserDiscountController from "../controllers/UserDiscountController"

// routes
export class UserDiscountRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router.post("/update", UserDiscountController.update)
	}
}
