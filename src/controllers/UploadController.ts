import {NextFunction, Request, Response} from "express"
import path from "path"
import fs from "fs"
import PSD from "psd"
import {v4 as uuidv4} from "uuid"

import {ApiResponse} from "../lib/APIResponse"
// import {uploadMultipleFiles, uploadSingleFile} from "../lib/Digitalocean"
import {BadRequestException} from "../lib/exceptions"
import {normalToKebabCase} from "../helpers/string"

class UploadController {
	constructor() {
		this.uploadSingle = this.uploadSingle.bind(this)
		this.uploadMultiple = this.uploadMultiple.bind(this)
		this.uploadPSD = this.uploadPSD.bind(this)
	}

	public async uploadSingle(req: Request, res: Response, next: NextFunction) {
		const response = new ApiResponse(res)
		try {
			if (!req.file) {
				throw new BadRequestException("No file provided")
			}

			const filePath: string = path.join("uploads", req.file.filename)

			const url: string = `${process.env.BASE_URL_API}/${filePath}`

			return response.successResponse({
				message: `File uploaded successfully`,
				data: {
					url,
					name: normalToKebabCase(req?.file?.originalname),
					size: req?.file?.size,
					mediaType: req?.file?.mimetype
				}
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

	public async uploadPSD(req: Request, res: Response, next: NextFunction) {
		const response = new ApiResponse(res)

		try {
			if (!req.file) {
				throw new BadRequestException("No PSD file provided")
			}

			// Upload path of the original PSD
			const filePath: string = path.join("uploads", req.file.filename)
			const url: string = `${process.env.BASE_URL_API}/${filePath}`

			// Parse PSD
			const psd = await PSD.open(req.file.path)
			await psd.parse()

			// Save PNG preview
			const previewFilename = `${uuidv4()}.png`
			const previewPath = path.join(
				process.cwd(),
				"public/previews",
				previewFilename
			)

			const writeStream = fs.createWriteStream(previewPath)
			psd.image.toPng().pack().pipe(writeStream)

			writeStream.on("finish", () => {
				const previewUrl = `${process.env.BASE_URL_API}/previews/${previewFilename}`

				return response.successResponse({
					message: "PSD uploaded and preview generated successfully",
					data: {
						url, // PSD file URL
						previewUrl, // Preview image URL
						name: normalToKebabCase(req?.file?.originalname ?? ""),
						size: req?.file?.size,
						mediaType: req?.file?.mimetype
					}
				})
			})

			writeStream.on("error", (err) => {
				console.error("Error writing PNG preview:", err)
				next(new BadRequestException("Failed to generate preview from PSD"))
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new UploadController()
