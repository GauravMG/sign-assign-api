import express, {Router} from "express"

import UserAddressManagementController from "../controllers/UserAddressManagementController"

// routes
export class UserAddressManagementRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", UserAddressManagementController.create)
			.post("/list", UserAddressManagementController.list)
			.post("/update", UserAddressManagementController.update)
			.post("/delete", UserAddressManagementController.delete)
	}
}
