import express, {Router} from "express"

import RelatedProductController from "../controllers/RelatedProductController"

// routes
export class RelatedProductRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/save", RelatedProductController.save)
			.post("/list", RelatedProductController.list)
			.post("/delete", RelatedProductController.delete)
	}
}
