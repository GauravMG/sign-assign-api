import express, {Router} from "express"

import ProductMediaController from "../controllers/ProductMediaController"

// routes
export class ProductMediaRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", ProductMediaController.create)
			.post("/list", ProductMediaController.list)
			.post("/update", ProductMediaController.update)
			.post("/update-sequence", ProductMediaController.updateSequence)
			.post("/delete", ProductMediaController.delete)
	}
}
