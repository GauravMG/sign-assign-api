import express, {Router} from "express"

import AuthController from "../controllers/AuthController"

// routes
export class AuthRouter {
	public readonly router: Router
	constructor() {
		this.router = express.Router()
		this.router
			.post("/check-email", AuthController.checkEmail)

			.post("/sign-in", AuthController.signIn)
			.post("/get-me", AuthController.getMe)
			.post("/refresh-token", AuthController.refreshToken)
			.post("/logout", AuthController.logout)

			.post("/register", AuthController.register)
			.post("/send-otp", AuthController.sendOTP)
			.post("/reset-password", AuthController.resetPassword)

			.post("/change-password", AuthController.changePassword)
	}
}
