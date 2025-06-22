import express, {Router} from "express"

import TemplateTagController from "../controllers/TemplateTagController"

// routes
export class TemplateTagRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", TemplateTagController.create)
			.post("/list", TemplateTagController.list)
			.post("/update", TemplateTagController.update)
			.post("/delete", TemplateTagController.delete)
	}
}
