import {NextFunction, Request, Response} from "express"
import path from "path"
import fs from "fs"
import {v4 as uuidv4} from "uuid"
import PSD from "psd"
import sharp from "sharp"
import {exec} from "child_process"

import {ApiResponse} from "../lib/APIResponse"
// import {uploadMultipleFiles, uploadSingleFile} from "../lib/Digitalocean"
import {BadRequestException} from "../lib/exceptions"
import {normalToKebabCase} from "../helpers/string"

class UploadController {
	constructor() {
		this.uploadSingle = this.uploadSingle.bind(this)
		this.uploadMultiple = this.uploadMultiple.bind(this)
		this.uploadArtwork = this.uploadArtwork.bind(this)
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

	public async uploadArtwork(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			if (!req.file) {
				return res.status(400).json({
					success: false,
					message: "No file uploaded"
				})
			}

			const filePath = path.join("uploads", req.file.filename)
			const url = `${process.env.BASE_URL_API}/${filePath}`

			const ext = path.extname(req.file.originalname).toLowerCase()
			const mime = req.file.mimetype
			let previewUrl = ""
			let previewFilename = `${uuidv4()}.png`

			const previewsDir = path.join(process.cwd(), "public/previews")
			const previewPath = path.join(previewsDir, previewFilename)

			if (!fs.existsSync(previewsDir)) {
				fs.mkdirSync(previewsDir, {recursive: true})
			}

			console.log("Processing file:", mime, ext)

			if (mime === "image/vnd.adobe.photoshop" || ext === ".psd") {
				// PSD preview
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
			} else if (mime === "image/x-eps" || ext === ".eps") {
				// EPS → convert to PNG using ImageMagick
				await new Promise((resolve, reject) => {
					exec(
						`convert -density 300 "${req?.file?.path}" -quality 90 "${previewPath}"`,
						(error, stdout, stderr) => {
							if (error) {
								console.error(stderr)
								reject(error)
							} else {
								resolve(true)
							}
						}
					)
				})

				previewUrl = `${process.env.BASE_URL_API}/previews/${previewFilename}`

				return response.successResponse({
					message: "Artwork uploaded successfully",
					data: {
						url,
						previewUrl,
						name: normalToKebabCase(req?.file?.originalname ?? ""),
						size: req?.file?.size,
						mediaType: mime
					}
				})
			} else if (
				mime === "application/postscript" ||
				[".ai", ".eps", ".ps"].includes(ext)
			) {
				// AI, EPS, PS → convert to PNG using ImageMagick
				await new Promise((resolve, reject) => {
					exec(
						`convert -density 300 "${req?.file?.path}" -quality 90 "${previewPath}"`,
						(error, stdout, stderr) => {
							if (error) {
								console.error(stderr)
								reject(error)
							} else {
								resolve(true)
							}
						}
					)
				})

				previewUrl = `${process.env.BASE_URL_API}/previews/${previewFilename}`

				return response.successResponse({
					message: "Artwork uploaded successfully",
					data: {
						url,
						previewUrl,
						name: normalToKebabCase(req?.file?.originalname ?? ""),
						size: req?.file?.size,
						mediaType: mime
					}
				})
			} else if (mime === "application/pdf" || ext === ".pdf") {
				// PDF preview → convert first page to PNG
				// const options = {
				// 	format: "png",
				// 	out_dir: previewsDir,
				// 	out_prefix: previewFilename.replace(".png", ""),
				// 	page: 1
				// }

				// await pdf.convert(req.file.path, options)
				// previewFilename = `${previewFilename.replace(".png", "")}-1.png`
				// previewUrl = `${process.env.BASE_URL_API}/previews/${previewFilename}`

				return response.successResponse({
					message: "Artwork uploaded successfully",
					data: {
						url,
						previewUrl,
						name: normalToKebabCase(req?.file?.originalname ?? ""),
						size: req?.file?.size,
						mediaType: mime
					}
				})
			} else if (mime.startsWith("image/")) {
				// Images: create a resized preview using sharp
				await sharp(req.file.path).resize({width: 800}).toFile(previewPath)

				previewUrl = `${process.env.BASE_URL_API}/previews/${previewFilename}`

				return response.successResponse({
					message: "Artwork uploaded successfully",
					data: {
						url,
						previewUrl,
						name: normalToKebabCase(req?.file?.originalname ?? ""),
						size: req?.file?.size,
						mediaType: mime
					}
				})
			} else {
				// Fallback: no preview
				previewUrl = `${process.env.BASE_URL}/images/no-preview-available.jpg`

				return response.successResponse({
					message: "Artwork uploaded successfully",
					data: {
						url,
						previewUrl,
						name: normalToKebabCase(req?.file?.originalname ?? ""),
						size: req?.file?.size,
						mediaType: mime
					}
				})
			}
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
