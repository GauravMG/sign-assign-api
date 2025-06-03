import express, {Router} from "express"

import BlogController from "../controllers/BlogController"

// routes
export class BlogRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", BlogController.create)
			.post("/list", BlogController.list)
			.post("/update", BlogController.update)
			.post("/delete", BlogController.delete)
	}
}
