import express, {Router} from "express"

import CouponController from "../controllers/CouponController"

// routes
export class CouponRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", CouponController.create)
			.post("/list", CouponController.list)
			.post("/update", CouponController.update)
			.post("/delete", CouponController.delete)
	}
}
