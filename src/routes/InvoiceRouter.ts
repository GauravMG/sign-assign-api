import express, {Router} from "express"

import InvoiceController from "../controllers/InvoiceController"

// routes
export class InvoiceRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/create", InvoiceController.create)
			.post("/list", InvoiceController.list)
			.post("/update", InvoiceController.update)
			.post("/delete", InvoiceController.delete)
	}
}
