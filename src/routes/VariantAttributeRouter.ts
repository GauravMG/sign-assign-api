import express, {Router} from "express"

import VariantAttributeController from "../controllers/VariantAttributeController"

// routes
export class VariantAttributeRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", VariantAttributeController.create)
			.post("/list", VariantAttributeController.list)
			.post("/update", VariantAttributeController.update)
			.post("/delete", VariantAttributeController.delete)
	}
}
