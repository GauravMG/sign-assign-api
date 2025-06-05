import {escapeJSONString} from "../helpers"
import {PrismaClientTransaction} from "../lib/PrismaLib"
import {DEFAULT_PAGE, DEFAULT_PAGE_SIZE, ListParams} from "../types/common"

export default class CommonModel {
	private TABLE_NAME: string
	private ID_COLUMN_NAME: string
	private SEARCH_COLUMN_NAME: string[]
	private CASE_SENSITIVE_COLUMN_NAME: string[]

	constructor(
		tableName: string,
		idColumnName: string,
		searchColumnName: string[],
		caseSensitiveColumnName?: string[]
	) {
		this.TABLE_NAME = tableName
		this.ID_COLUMN_NAME = idColumnName
		this.SEARCH_COLUMN_NAME = searchColumnName
		this.CASE_SENSITIVE_COLUMN_NAME = caseSensitiveColumnName ?? []
	}

	rawQuery = async (
		transaction: PrismaClientTransaction,
		query: string
	): Promise<any> => {
		try {
			// Start a transaction
			const result = await transaction.$queryRawUnsafe(query)

			return result
		} catch (error) {
			throw error
		}
	}

	bulkCreate = async (
		transaction: PrismaClientTransaction,
		inputData: Record<string, any>[],
		createdById?: number
	) => {
		try {
			// Dynamically get the model from Prisma Client
			const model = transaction[this.TABLE_NAME]

			// Ensure the model exists in Prisma Client
			if (!model) {
				throw new Error(`Model ${this.TABLE_NAME} does not exist`)
			}

			// Process each entry in inputData
			for (let i = 0; i < inputData.length; i++) {
				if (Object.keys(inputData[i]).length) {
					// Add createdById to the current entry
					inputData[i].createdById = createdById

					// Process each key-value pair in the current entry
					const elements = Object.keys(inputData[i])
					for (const el of elements) {
						// Escape string values
						inputData[i][el] = await escapeJSONString(inputData[i][el])

						// Remove falsy or empty values, or trim strings
						if (
							(["boolean", "number"].indexOf(typeof inputData[i][el]) < 0 &&
								!inputData[i][el]) ||
							(typeof inputData[i][el] === "string" &&
								inputData[i][el].trim() === "")
						) {
							delete inputData[i][el] // Delete keys with empty or falsy values
						} else if (typeof inputData[i][el] === "string") {
							inputData[i][el] = inputData[i][el].trim() // Trim string values
						}
					}
				}
			}

			// Construct the raw SQL query
			const columns = `"${Object.keys(inputData[0]).join('", "')}"` // Extract columns from the first item
			const values = inputData
				.map(
					(data) =>
						`(${Object.values(data)
							.map((v) => `'${v}'`)
							.join(", ")})`
				)
				.join(", ") // Convert inputData to SQL-friendly value format

			// Construct the raw query string for insertion
			const query = `
				INSERT INTO "${this.TABLE_NAME}" (${columns})
				VALUES ${values}
				RETURNING *;
			`

			// Start a transaction
			const result = await transaction.$queryRawUnsafe(query)

			return result
		} catch (error) {
			throw error
		}
	}

	list = async (
		transaction: PrismaClientTransaction,
		{
			filter = {},
			filtersNotBeIncluded = {},
			customFilters = [],
			range,
			sort = [{orderBy: "createdAt", orderDir: "desc"}],
			fields = [],
			isCountOnly = false,
			isIncludeDeleted = false,
			groupBy = []
		}: ListParams
	): Promise<any> => {
		try {
			// Dynamically get the model from Prisma Client
			const model = transaction[this.TABLE_NAME]

			// Ensure the model exists in Prisma Client
			if (!model) {
				throw new Error(`Model ${this.TABLE_NAME} does not exist`)
			}

			// Building where clause based on filter
			const where: any = isIncludeDeleted ? {} : {deletedAt: null} // Exclude soft-deleted entries by default

			// Apply filters from the filter object
			if (filter) {
				for (const [key, value] of Object.entries(filter)) {
					if (value === undefined || value === null || value === "") continue // Skip empty values

					// If the key is 'search', apply case-insensitive searching on the specified columns
					if (key === "search" && value) {
						where.OR = this.SEARCH_COLUMN_NAME.map((column) => {
							let newData: any = {
								[column]: {
									contains: value
								}
							}
							if (this.CASE_SENSITIVE_COLUMN_NAME.indexOf(key) < 0) {
								newData[column] = {
									...newData[column],
									mode: "insensitive" // Case-insensitive search
								}
							}

							return {...newData}
						})
					}
					// Handle array values with 'in' for fields like email
					else if (Array.isArray(value)) {
						where[key] = {in: value}
					}
					// General filter handling for primitive values
					else if (typeof value === "string") {
						where[key] = {
							equals: value
						}
						if (this.CASE_SENSITIVE_COLUMN_NAME.indexOf(key) < 0) {
							where[key] = {
								...where[key],
								mode: "insensitive" // Case-insensitive search
							}
						}
					} else {
						where[key] = value
					}
				}
			}

			// Apply filtersNotBeIncluded (exclude specific values)
			if (filtersNotBeIncluded) {
				for (const [key, value] of Object.entries(filtersNotBeIncluded)) {
					if (value === undefined || value === null || value === "") continue

					where[key] = {
						not: value // exclude specific values
					}
				}
			}

			// Add custom where conditions (from customFilters array)
			if (customFilters.length) {
				where.AND = where.AND || []
				where.AND.push(...customFilters) // Combine custom filter with the base `where`
			}

			// Return count if requested
			if (isCountOnly) {
				return model.count({
					where
				})
			}

			// Default range for pagination
			const page = range?.page || DEFAULT_PAGE
			const pageSize = range?.pageSize || DEFAULT_PAGE_SIZE
			const skip = (page - 1) * pageSize
			const take = pageSize

			// Default sorting
			const finalSort: any[] =
				sort?.map((s) => ({
					[s.orderBy]: s.orderDir
				})) ?? []

			// If sorting is provided, append createdAt desc as the last sorting field
			if (!finalSort.some((s) => s.createdAt)) {
				finalSort.push({createdAt: "desc"})
			}

			// Field selection
			const select: any = fields
				? fields.reduce((acc: any, field) => {
						const [column, alias] = field.split(" AS ")
						acc[column] = true
						if (alias) acc[alias] = true
						return acc
					}, undefined)
				: undefined // default to selecting all fields if not provided

			// Grouping logic (using columns specified in groupBy)
			const groupByOptions = groupBy.length
				? groupBy.map((column) => ({
						by: [column]
					}))
				: undefined

			// Prisma query options setup
			const queryOptions: any = {
				where,
				orderBy: finalSort,
				select,
				groupBy: groupByOptions
			}
			if (!range?.all) {
				queryOptions.skip = skip
				queryOptions.take = take
			}

			return await model.findMany(queryOptions)
		} catch (error) {
			throw error
		}
	}

	updateById = async (
		transaction: PrismaClientTransaction,
		data: Record<string, any>,
		id: number,
		updatedById?: number
	): Promise<any> => {
		try {
			// Dynamically get the model from Prisma Client
			const model = transaction[this.TABLE_NAME]

			// Ensure the model exists in Prisma Client
			if (!model) {
				throw new Error(`Model ${this.TABLE_NAME} does not exist`)
			}

			const updateData: any = {} // To hold the fields to update
			const columns = Object.keys(data)

			// Process each column in the data object
			for (let column of columns) {
				// Escape JSON formatted data if necessary
				data[column] = await escapeJSONString(data[column])

				// Handle undefined values and remove them
				if (data[column] === undefined) {
					delete data[column] // Remove undefined values
				} else {
					// Handle empty strings
					if (typeof data[column] === "string" && data[column].trim() === "") {
						data[column] = null // Set empty strings to null
					}

					// If the value is not undefined or an empty string, add it to updateData
					if (data[column] !== undefined) {
						updateData[column] = data[column]
					}
				}
			}

			// Add updatedAt field and optionally updatedById field
			updateData.updatedAt = new Date()
			if (updatedById) {
				updateData.updatedById = updatedById
			}

			// Perform the update in a transaction
			const result = await model.update({
				where: {
					[this.ID_COLUMN_NAME]: id
				},
				data: updateData
			})

			return result
		} catch (error) {
			throw error
		}
	}

	updateByFilters = async (
		transaction: PrismaClientTransaction,
		data: Record<string, any>,
		filter: Record<string, any>,
		updatedById?: number
	): Promise<any> => {
		try {
			// Dynamically get the model from Prisma Client
			const model = transaction[this.TABLE_NAME]

			// Ensure the model exists in Prisma Client
			if (!model) {
				throw new Error(`Model ${this.TABLE_NAME} does not exist`)
			}

			const updateData: any = {} // To hold the fields to update
			const columns = Object.keys(data)

			// Process each column in the data object
			for (let column of columns) {
				// Escape JSON formatted data if necessary
				data[column] = await escapeJSONString(data[column])

				// Handle undefined values and remove them
				if (data[column] === undefined) {
					delete data[column] // Remove undefined values
				} else {
					// Handle empty strings
					if (typeof data[column] === "string" && data[column].trim() === "") {
						data[column] = null // Set empty strings to null
					}

					// If the value is not undefined or an empty string, add it to updateData
					if (data[column] !== undefined) {
						updateData[column] = data[column]
					}
				}
			}

			// Add updatedAt field and optionally updatedById field
			updateData.updatedAt = new Date()
			if (updatedById) {
				updateData.updatedById = updatedById
			}

			// Prepare filter dynamically
			let dynamicFilters: Record<string, any> = {}

			Object.keys(filter).forEach((column) => {
				// Dynamically adjust how the filter is applied
				switch (typeof filter[column]) {
					case "number":
						dynamicFilters[column] = filter[column] // Numeric filter
						break
					case "object":
						if (Array.isArray(filter[column])) {
							dynamicFilters[column] = {in: filter[column]} // Array filter
						} else if (filter[column] instanceof Date) {
							dynamicFilters[column] = filter[column] // Date filter
						} else {
							dynamicFilters[column] = filter[column] // Handle objects like JSON, etc.
						}
						break
					default:
						dynamicFilters[column] = filter[column] // String filter
				}
			})

			// Add condition for soft delete: `deletedAt IS NULL`
			dynamicFilters.deletedAt = {equals: null}

			// Perform the update in a transaction
			const result = await model.updateMany({
				where: dynamicFilters, // Apply dynamically constructed filter
				data: updateData
			})

			return result
		} catch (error) {
			throw error
		}
	}

	softDeleteByIds = async (
		transaction: PrismaClientTransaction,
		ids: number[],
		deletedById?: number
	): Promise<any> => {
		try {
			// Dynamically get the model from Prisma Client
			const model = transaction[this.TABLE_NAME]

			// Ensure the model exists in Prisma Client
			if (!model) {
				throw new Error(`Model ${this.TABLE_NAME} does not exist`)
			}

			// Start a transaction to ensure atomicity
			const result = await model.updateMany({
				where: {
					[this.ID_COLUMN_NAME]: {in: ids} // Filter by IDs
				},
				data: {
					deletedAt: new Date(), // Set the deletedAt field for soft delete
					deletedById
				}
			})

			return result
		} catch (error) {
			throw error
		}
	}

	softDeleteByFilter = async (
		transaction: PrismaClientTransaction,
		filter: Record<string, any>,
		deletedById?: number
	): Promise<any> => {
		try {
			// Dynamically get the model from Prisma Client
			const model = transaction[this.TABLE_NAME]

			// Ensure the model exists in Prisma Client
			if (!model) {
				throw new Error(`Model ${this.TABLE_NAME} does not exist`)
			}

			// Prepare filter dynamically
			let dynamicFilters: Record<string, any> = {}

			Object.keys(filter).forEach((column) => {
				// Dynamically adjust how the filter is applied
				switch (typeof filter[column]) {
					case "number":
						dynamicFilters[column] = filter[column] // Numeric filter
						break
					case "object":
						if (Array.isArray(filter[column])) {
							dynamicFilters[column] = {in: filter[column]} // Array filter
						} else if (filter[column] instanceof Date) {
							dynamicFilters[column] = filter[column] // Date filter
						} else {
							dynamicFilters[column] = filter[column] // Handle objects like JSON, etc.
						}
						break
					default:
						dynamicFilters[column] = filter[column] // String filter
				}
			})

			// Add condition for soft delete: `deletedAt IS NULL`
			dynamicFilters.deletedAt = {equals: null}

			// Start a transaction to ensure atomicity
			const result = await model.updateMany({
				where: dynamicFilters, // Apply dynamically constructed filter
				data: {
					deletedAt: new Date(), // Set the deletedAt field for soft delete
					deletedById
				}
			})

			return result
		} catch (error) {
			throw error
		}
	}
}
