import express, {Router} from "express"

import OrderStaffMappingController from "../controllers/OrderStaffMappingController"

// routes
export class OrderStaffMappingRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", OrderStaffMappingController.create)
			.post("/list", OrderStaffMappingController.list)
			.post("/update", OrderStaffMappingController.update)
			.post("/delete", OrderStaffMappingController.delete)
	}
}
