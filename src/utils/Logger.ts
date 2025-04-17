import {createStream} from "rotating-file-stream"
import path from "path"
import moment from "moment"
import fs from "fs"

// Define log directories
const logBasePath = path.join(process.cwd(), "public/logs")
const accessLogPath = path.join(logBasePath, "access")
const errorLogPath = path.join(logBasePath, "error")

// Ensure the log directories exist
;[accessLogPath, errorLogPath].forEach((dir) => {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, {recursive: true})
	}
})

// Helper function for dynamic log filenames
const generateLogFilename = (baseName: string) => {
	const date = moment().format("YYYY-MM-DD") // e.g., 2024-12-12
	return `${baseName}-${date}.log`
}

// Rotating file streams for access and error logs
export const accessLogStream = createStream(
	(time, index) => generateLogFilename("access"),
	{
		interval: "1d", // Rotate daily
		path: accessLogPath // Access logs directory
	}
)

const errorLogStream = createStream(
	(time, index) => generateLogFilename("error"),
	{
		interval: "1d", // Rotate daily
		path: errorLogPath // Error logs directory
	}
)

// Helper function for logging
export const logMessage = (type: "access" | "error", message: string): void => {
	const formattedMessage = `${new Date().toISOString()} - ${message}\n`

	// Log to the console if in development mode
	if ((process.env.NODE_ENV as string) === "development") {
		if (type === "access") {
			console.log(`[ACCESS]: ${message}`)
		} else if (type === "error") {
			console.error(`[ERROR]: ${message}`)
		}
	}

	// Write to the appropriate log stream
	if (type === "access") {
		accessLogStream.write(formattedMessage)
	} else if (type === "error") {
		errorLogStream.write(formattedMessage)
	}
}
