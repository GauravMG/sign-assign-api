import {Request, Response, NextFunction} from "express"

// access control middleware
export const accessControl = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	res.header("Access-Control-Allow-Origin", "*")
	res.header(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept, Authorization"
	)
	res.header("Access-Control-Allow-Credentials", "true")
	res.header("Access-Control-Allow-Methods", "POST,GET,OPTIONS")
	next()
}

// optional middle ware
export const optionsMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	if (req.method !== "OPTIONS") {
		next()
		return
	}

	res.statusCode = 200
	res.end("OK")
}

// 404 middleware
export const middleware404 = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	next({
		message: `No router for Requested URL ${req.originalUrl}`,
		statusCode: 404,
		errorCode: `not_found`
	})
}
