import express, {Router} from "express"

import TemplateTagController from "../controllers/TemplateTagController"

// routes
export class TemplateTagRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/save", TemplateTagController.save)
			.post("/list", TemplateTagController.list)
			.post("/delete", TemplateTagController.delete)
	}
}
