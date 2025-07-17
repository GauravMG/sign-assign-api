import express, {Router} from "express"

import CouponTagController from "../controllers/CouponTagController"

// routes
export class CouponTagRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/save", CouponTagController.save)
			.post("/list", CouponTagController.list)
			.post("/delete", CouponTagController.delete)
	}
}
