import express, {Router} from "express"

import UserAddressController from "../controllers/UserAddressController"

// routes
export class UserAddressRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", UserAddressController.create)
			.post("/list", UserAddressController.list)
			.post("/update", UserAddressController.update)
			.post("/delete", UserAddressController.delete)
	}
}
