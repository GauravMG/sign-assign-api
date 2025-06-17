import express, {Router} from "express"

import OrderStaffTaskController from "../controllers/OrderStaffTaskController"

// routes
export class OrderStaffTaskRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", OrderStaffTaskController.create)
			.post("/list", OrderStaffTaskController.list)
			.post("/update", OrderStaffTaskController.update)
			.post("/delete", OrderStaffTaskController.delete)
	}
}
