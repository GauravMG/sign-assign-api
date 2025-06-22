import express, {Router} from "express"

import TemplateController from "../controllers/TemplateController"

// routes
export class TemplateRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", TemplateController.create)
			.post("/list", TemplateController.list)
			.post("/update", TemplateController.update)
			.post("/delete", TemplateController.delete)
	}
}
