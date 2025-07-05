import express, {Router} from "express"

import RushHourRateController from "../controllers/RushHourRateController"

// routes
export class RushHourRateRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/list", RushHourRateController.list)
			.post("/update", RushHourRateController.update)
			.post("/delete", RushHourRateController.delete)
	}
}
