import {Prisma} from "@prisma/client"
import {NextFunction, Request, Response} from "express"
import moment from "moment"

import {logMessage} from "../utils/Logger" // Importing the error log stream

// Error handling middleware
export const errorHandler = (
	err: any,
	req: Request,
	res: Response,
	next: NextFunction
): any => {
	let errorMessage: string = err.message ?? "Something went wrong"
	let errorStatusCode: number = err.statusCode ?? 422
	let errorCode = err.errorCode

	// Handle Prisma errors first
	if (err instanceof Prisma.PrismaClientKnownRequestError) {
		switch (err.code) {
			case "P2002":
				errorMessage =
					"A unique constraint violation occurred. The data you are trying to enter already exists."
				errorStatusCode = 400
				errorCode = "unique_constraint_violation"
				break
			case "P2003":
				errorMessage =
					"A foreign key constraint failed. Ensure referenced data exists."
				errorStatusCode = 400
				errorCode = "foreign_key_constraint_failed"
				break
			case "P2025":
				errorMessage = "The requested record was not found in the database."
				errorStatusCode = 404
				errorCode = "record_not_found"
				break
			default:
				errorMessage = "A database error occurred."
				errorStatusCode = 500
				errorCode = `prisma_error_${err.code}`
				break
		}
	} else if (err instanceof Prisma.PrismaClientValidationError) {
		errorMessage = "Invalid data format. Please check your input."
		errorStatusCode = 400
		errorCode = "prisma_validation_error"
	} else if (err instanceof Prisma.PrismaClientInitializationError) {
		errorMessage = "Database connection error. Please try again later."
		errorStatusCode = 500
		errorCode = "prisma_initialization_error"
	} else if (err instanceof Prisma.PrismaClientRustPanicError) {
		errorMessage = "A critical database error occurred. Please try again later."
		errorStatusCode = 500
		errorCode = "prisma_panic_error"
	}

	// Handle JWT-related errors
	if (
		["jwt_expired", "jwt_malformed", "jwt expired", "jwt malformed"].includes(
			errorMessage
		)
	) {
		errorStatusCode = 401
		errorCode = "unauthorized"
	}

	// Set default error codes if not assigned yet
	if (!errorCode) {
		switch (errorStatusCode) {
			case 400:
				errorCode = "unexpected_error"
				break
			case 401:
				errorCode = "unauthorized"
				break
			case 403:
				errorCode = "not_enough_permissions"
				break
			case 404:
				errorCode = "not_found"
				break
			default:
				errorCode = "internal_server_error"
				break
		}
	}

	// Create the error log message with timestamp and request details
	const errorMessageLogging: string =
		`${moment().format("YYYY-MM-DD HH:mm:ss")} - ` +
		`${req.method} ${req.url} ` + // Request method and URL
		`- ${errorMessage} ` + // Error message
		`- Status: ${errorStatusCode} ` + // Status code
		`- IP: ${req.ip} ` + // Client IP address
		`- User-Agent: ${req.get("User-Agent")} ` + // User-Agent
		`- Referrer: ${req.get("Referrer") || "N/A"} ` + // Referrer (if available)
		`- Stack Trace: ${err.stack || "No stack trace available"}\n` // Stack trace (if available)

	// Write to the error log stream
	logMessage("error", errorMessageLogging)

	let errorFinalObject: any = {
		success: false,
		status: errorStatusCode,
		message: errorMessage,
		code: errorCode
	}
	if (err.data) {
		errorFinalObject.data = err.data
	}

	// In development, send the full error stack for debugging
	if (process.env.NODE_ENV === "development") {
		errorFinalObject = {
			...errorFinalObject,
			stack: err instanceof Error ? err.stack : undefined // Include stack trace in dev mode
		}
	}

	return res.status(errorStatusCode).json(errorFinalObject)
}
