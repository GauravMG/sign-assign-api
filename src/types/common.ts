import {PrismaClient} from "@prisma/client"

export type OrderDir = "asc" | "desc"

export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 10

export type Range = Partial<{
	page: number
	pageSize: number
	all: boolean
}>

export type Sort = {
	orderBy: string
	orderDir: OrderDir
}

export type ListParams = {
	filter?: Record<string, any> // key-value pairs for filtering
	filtersNotBeIncluded?: Record<string, any> // key-value pairs for excluding entries
	customFilters?: string[] // additional custom where conditions
	range?: Range // pagination
	sort?: Sort[] // sorting
	fields?: string[] // specific fields
	isCountOnly?: boolean // return only count
	isIncludeDeleted?: boolean // include soft deleted entries
	groupBy?: string[] // array of column names for grouping
}

export type Timestamp = {
	createdAt: string
	updatedAt: string
	deletedAt: string
}

export type Manipulator = {
	createdBy: string
	updatedBy: string
	deletedBy: string
}

export type Error = {
	message: string
	status?: number
	code?: string
	stack?: string
}

export type Headers = any & {
	userId: number
	roleId: number
	userFullName?: string | null
	businessId?: number | null
	transaction: PrismaClient
	chatsessionid?: string | null
	chatuserid?: string | null
}

export type UrlSchema =
	| {
			apiPath: string
			method: string
	  }
	| undefined

export enum ApprovalStatus {
	Pending = "pending",
	Approved = "approved",
	Rejected = "rejected"
}
