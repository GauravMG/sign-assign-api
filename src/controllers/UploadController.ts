import {NextFunction, Request, Response} from "express"
import path from "path"
import fs from "fs"
import {v4 as uuidv4} from "uuid"
import PSD from "psd"
import sharp from "sharp"
import {exec} from "child_process"
import axios from "axios"

import {ApiResponse} from "../lib/APIResponse"
// import {uploadMultipleFiles, uploadSingleFile} from "../lib/Digitalocean"
import {BadRequestException} from "../lib/exceptions"
import {normalToKebabCase} from "../helpers/string"

class UploadController {
	constructor() {
		this.uploadSingle = this.uploadSingle.bind(this)
		this.uploadMultiple = this.uploadMultiple.bind(this)
		this.uploadArtwork = this.uploadArtwork.bind(this)
		this.convertToSVG = this.convertToSVG.bind(this)
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
							url,
							previewUrl,
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
			} else if (mime === "image/svg+xml" || ext === ".svg") {
				// SVG → PNG preview using sharp
				await sharp(req.file.path)
					.resize({width: 800})
					.png()
					.toFile(previewPath)

				previewUrl = `${process.env.BASE_URL_API}/previews/${previewFilename}`

				return response.successResponse({
					message: "SVG uploaded and preview generated successfully",
					data: {
						url, // original SVG file URL
						previewUrl, // preview PNG
						name: normalToKebabCase(req?.file?.originalname ?? ""),
						size: req?.file?.size,
						mediaType: mime
					}
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
				// Other images: create resized preview
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
				// Fallback
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

	public async convertToSVG(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			let inputPath: string | null = null
			let originalName: string | null = null
			let mime: string | null = null
			let size: number | null = null
			let tempFilePath: string | null = null

			if (req.body.url) {
				// 🟢 Remote URL scenario
				const remoteUrl = req.body.url
				console.log("Downloading remote file:", remoteUrl)

				const downloadResponse = await axios.get(remoteUrl, {
					responseType: "arraybuffer"
				})

				if (!downloadResponse.data) {
					return res.status(400).json({
						success: false,
						message: "Could not download remote file."
					})
				}

				const contentType = downloadResponse.headers["content-type"] || ""
				mime = contentType
				size = parseInt(downloadResponse.headers["content-length"] || "0")

				// Infer extension
				let ext = ""
				if (contentType.includes("photoshop")) ext = ".psd"
				else if (contentType.includes("postscript")) ext = ".eps"
				else if (contentType.includes("pdf")) ext = ".pdf"
				else if (remoteUrl.endsWith(".psd")) ext = ".psd"
				else if (remoteUrl.endsWith(".eps")) ext = ".eps"
				else if (remoteUrl.endsWith(".ai")) ext = ".ai"
				else if (remoteUrl.endsWith(".pdf")) ext = ".pdf"
				else ext = path.extname(remoteUrl)

				originalName = path.basename(remoteUrl)
				const filename = `${uuidv4()}${ext}`
				tempFilePath = path.join(process.cwd(), "temp", filename)

				// Ensure temp folder exists
				const tempDir = path.join(process.cwd(), "temp")
				if (!fs.existsSync(tempDir)) {
					fs.mkdirSync(tempDir, {recursive: true})
				}

				fs.writeFileSync(tempFilePath, downloadResponse.data)
				inputPath = tempFilePath
			} else if (req.file) {
				// 🟢 Uploaded file scenario
				inputPath = req.file.path
				originalName = req.file.originalname
				mime = req.file.mimetype
				size = req.file.size
			} else {
				return res.status(400).json({
					success: false,
					message: "No file uploaded or URL provided"
				})
			}

			if (!inputPath || !originalName || !mime) {
				throw new BadRequestException("Failed to prepare input for conversion.")
			}

			const ext = path.extname(originalName).toLowerCase()
			const svgFilename = `${uuidv4()}.svg`
			const svgsDir = path.join(process.cwd(), "public/svgs")
			const svgPath = path.join(svgsDir, svgFilename)

			if (!fs.existsSync(svgsDir)) {
				fs.mkdirSync(svgsDir, {recursive: true})
			}

			console.log("Processing SVG conversion for:", mime, ext)

			if (
				mime === "image/x-eps" ||
				mime === "application/postscript" ||
				[".eps", ".ai", ".ps"].includes(ext)
			) {
				// EPS, AI, PS → SVG
				await new Promise<void>((resolve, reject) => {
					const cmd = `inkscape "${inputPath}" --export-type=svg --export-filename="${svgPath}"`
					exec(cmd, (error, stdout, stderr) => {
						if (error) {
							console.error("Inkscape error:", stderr)
							reject(error)
						} else {
							console.log("Inkscape output:", stdout)
							resolve()
						}
					})
				})

				const svgUrl = `${process.env.BASE_URL_API}/svgs/${svgFilename}`

				if (tempFilePath && fs.existsSync(tempFilePath)) {
					fs.unlinkSync(tempFilePath)
				}

				return response.successResponse({
					message: "File converted to SVG successfully",
					data: {
						svgUrl,
						name: normalToKebabCase(originalName || ""),
						size,
						mediaType: mime
					}
				})
			} else if (mime === "application/pdf" || ext === ".pdf") {
				// PDF → SVG (first page)
				await new Promise<void>((resolve, reject) => {
					const cmd = `inkscape "${inputPath}" --export-type=svg --export-filename="${svgPath}" --pdf-page=1`
					exec(cmd, (error, stdout, stderr) => {
						if (error) {
							console.error("Inkscape error:", stderr)
							reject(error)
						} else {
							console.log("Inkscape output:", stdout)
							resolve()
						}
					})
				})

				const svgUrl = `${process.env.BASE_URL_API}/svgs/${svgFilename}`

				if (tempFilePath && fs.existsSync(tempFilePath)) {
					fs.unlinkSync(tempFilePath)
				}

				return response.successResponse({
					message: "PDF converted to SVG successfully",
					data: {
						svgUrl,
						name: normalToKebabCase(originalName || ""),
						size,
						mediaType: mime
					}
				})
			} else {
				// Not supported for SVG
				if (tempFilePath && fs.existsSync(tempFilePath)) {
					fs.unlinkSync(tempFilePath)
				}

				return response.successResponse({
					message: "SVG conversion not supported for this file type",
					data: {
						svgUrl: null,
						name: normalToKebabCase(originalName || ""),
						size,
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
