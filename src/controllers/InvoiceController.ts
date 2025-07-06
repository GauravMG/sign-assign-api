import {NextFunction, Request, Response} from "express"

import {listAPIPayload} from "../helpers"
import {ApiResponse} from "../lib/APIResponse"
import {PrismaClientTransaction, prisma} from "../lib/PrismaLib"
import {BadRequestException} from "../lib/exceptions"
import CommonModel from "../models/CommonModel"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, Headers} from "../types/common"

class InvoiceController {
	private commonModelInvoice

	private idColumnInvoice: string = "invoiceId"

	constructor() {
		this.commonModelInvoice = new CommonModel("Invoice", this.idColumnInvoice, [
			"invoiceNumber"
		])

		this.create = this.create.bind(this)
		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
		this.delete = this.delete.bind(this)
	}

	public async create(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			let payload = Array.isArray(req.body) ? req.body : [req.body]

			const [invoice] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// create
					const invoice = await this.commonModelInvoice.bulkCreate(
						transaction,
						payload,
						userId
					)

					return [invoice]
				}
			)

			return response.successResponse({
				message: `Invoice created successfully`,
				data: invoice
			})
		} catch (error) {
			next(error)
		}
	}

	public async list(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {roleId}: Headers = req.headers

			const {filter, range, sort} = await listAPIPayload(req.body)

			const [invoices, total] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					let [invoices, total] = await Promise.all([
						this.commonModelInvoice.list(transaction, {
							filter,
							range,
							sort
						}),

						this.commonModelInvoice.list(transaction, {
							filter,
							isCountOnly: true
						})
					])

					return [invoices, total]
				}
			)

			return response.successResponse({
				message: `Invoice data`,
				metadata: {
					total,
					page: range?.page ?? DEFAULT_PAGE,
					pageSize: range?.pageSize ?? DEFAULT_PAGE_SIZE
				},
				data: invoices
			})
		} catch (error) {
			next(error)
		}
	}

	public async update(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {invoiceId, ...restPayload} = req.body

			const [invoice] = await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					// check if exists
					const [existingInvoice] = await this.commonModelInvoice.list(
						transaction,
						{
							filter: {
								invoiceId
							}
						}
					)
					if (!existingInvoice) {
						throw new BadRequestException("Invoice doesn't exist")
					}

					// update
					await this.commonModelInvoice.updateById(
						transaction,
						restPayload,
						invoiceId,
						userId
					)

					// get updated details
					const [invoice] = await this.commonModelInvoice.list(transaction, {
						filter: {
							invoiceId
						}
					})

					return [invoice]
				}
			)

			return response.successResponse({
				message: `Details updated successfully`,
				data: invoice
			})
		} catch (error) {
			next(error)
		}
	}

	public async delete(req: Request, res: Response, next: NextFunction) {
		try {
			const response = new ApiResponse(res)

			const {userId, roleId}: Headers = req.headers

			const {invoiceIds} = req.body

			if (!invoiceIds?.length) {
				throw new BadRequestException(`Please select invoice to be deleted`)
			}

			await prisma.$transaction(
				async (transaction: PrismaClientTransaction) => {
					const existingInvoices = await this.commonModelInvoice.list(
						transaction,
						{
							filter: {
								invoiceId: invoiceIds
							}
						}
					)
					if (!existingInvoices.length) {
						const invoiceIdsSet: Set<number> = new Set(
							existingInvoices.map((obj) => obj.invoiceId)
						)
						throw new BadRequestException(
							`Selected invoice not found: ${invoiceIds.filter((invoiceId) => !invoiceIdsSet.has(invoiceId))}`
						)
					}

					await this.commonModelInvoice.softDeleteByIds(
						transaction,
						invoiceIds,
						userId
					)
				}
			)

			return response.successResponse({
				message: `Invoice deleted successfully`
			})
		} catch (error) {
			next(error)
		}
	}
}

export default new InvoiceController()
