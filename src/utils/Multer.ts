import {Request} from "express"
import multer from "multer"
import path from "path"

function replaceSpecialChars(inputString) {
	return inputString.replace(/[^a-zA-Z0-9]/g, "-")
}

// Define storage settings
const storage = multer.diskStorage({
	destination: (req: Request, file: Express.Multer.File, cb) => {
		cb(null, path.join(process.cwd(), "public/uploads")) // Directory for uploads
	},
	filename: (req: Request, file: Express.Multer.File, cb) => {
		const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
		const extension = path.extname(file.originalname)
		cb(
			null,
			`${replaceSpecialChars(file.originalname)}-${uniqueSuffix}${extension}`
		)
	}
})

// Define file filter to allow only certain file types
const fileFilter = (
	req: Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback
) => {
	const allowedTypes = ["image/jpeg", "image/png", "image/gif"]
	if (allowedTypes.includes(file.mimetype)) {
		cb(null, true) // Accept the file
	} else {
		cb(new Error("Unsupported file type") as unknown as null, false) // Reject the file
	}
}

// Set limits for uploaded files
const limits = {
	fileSize: 20 * 1024 * 1024 // 20 MB
}

// Create the Multer instance
const upload = multer({
	storage,
	fileFilter,
	limits
})

export default upload
