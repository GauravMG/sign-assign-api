import express, {Router} from "express"

import BannerController from "../controllers/BannerController"

// routes
export class BannerRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", BannerController.create)
			.post("/list", BannerController.list)
			.post("/update", BannerController.update)
			.post("/update-sequence", BannerController.updateSequence)
			.post("/delete", BannerController.delete)
	}
}
