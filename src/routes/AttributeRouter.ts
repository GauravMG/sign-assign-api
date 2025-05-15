import express, {Router} from "express"

import AttributeController from "../controllers/AttributeController"

// routes
export class AttributeRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", AttributeController.create)
			.post("/list", AttributeController.list)
			.post("/update", AttributeController.update)
			.post("/delete", AttributeController.delete)
	}
}
