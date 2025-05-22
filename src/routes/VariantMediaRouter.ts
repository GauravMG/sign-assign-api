import express, {Router} from "express"

import VariantMediaController from "../controllers/VariantMediaController"

// routes
export class VariantMediaRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", VariantMediaController.create)
			.post("/list", VariantMediaController.list)
			.post("/update", VariantMediaController.update)
			.post("/update-sequence", VariantMediaController.updateSequence)
			.post("/delete", VariantMediaController.delete)
	}
}
