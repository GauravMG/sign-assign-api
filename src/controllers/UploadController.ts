import {NextFunction, Request, Response} from "express"
import path from "path"

import {ApiResponse} from "../lib/APIResponse"
// import {uploadMultipleFiles, uploadSingleFile} from "../lib/Digitalocean"
import {BadRequestException} from "../lib/exceptions"

class UploadController {
	constructor() {
		this.uploadSingle = this.uploadSingle.bind(this)
		this.uploadMultiple = this.uploadMultiple.bind(this)
	}

	public async uploadSingle(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			if (!req.file) {
				throw new BadRequestException("No file provided")
			}

			const filePath: string = path.join("uploads", req.file.filename)

			const url: string = `${process.env.BASE_URL_API}/${filePath}`

			return response.successResponse({
				message: `File uploaded successfully`,
				data: {url}
			})
		} catch (error) {
			next(error)
		}
	}

	public async uploadMultiple(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			if (!req.files || !Array.isArray(req.files)) {
				throw new BadRequestException("No files provided")
			}

			const files = req.files.map((file: Express.Multer.File) => ({
				filePath: file.path
			}))

			// Upload all files to DigitalOcean Spaces
			// const urls: string[] = await uploadMultipleFiles(files)
			const urls: string[] = [""]

			return response.successResponse({
				message: `Files uploaded successfully`,
				data: {urls}
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new UploadController()
