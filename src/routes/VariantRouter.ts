import express, {Router} from "express"

import VariantController from "../controllers/VariantController"

// routes
export class VariantRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", VariantController.create)
			.post("/list", VariantController.list)
			.post("/update", VariantController.update)
			.post("/delete", VariantController.delete)
	}
}
