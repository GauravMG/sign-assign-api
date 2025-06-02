import express, {Router} from "express"

import BlogMediaController from "../controllers/BlogMediaController"

// routes
export class BlogMediaRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", BlogMediaController.create)
			.post("/list", BlogMediaController.list)
			.post("/update", BlogMediaController.update)
			.post("/update-sequence", BlogMediaController.updateSequence)
			.post("/delete", BlogMediaController.delete)
	}
}
