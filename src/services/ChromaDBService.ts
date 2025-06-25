import {
	ChromaClient,
	Collection,
	IncludeEnum,
	OpenAIEmbeddingFunction,
	QueryRecordsParams
} from "chromadb"
import dotenv from "dotenv"
import {v4 as uuidv4, v5 as uuidv5} from "uuid"

import {chunkTextByTokens} from "../helpers"
import {logMessage} from "../utils/Logger"
import OpenAI from "openai"

dotenv.config()

const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"

function toValidChromaName(input: string): string {
	return uuidv5(input, NAMESPACE)
}

interface CollectionOptions {
	name: string
	metadata?: Record<string, any>
}

interface DocumentInput {
	ids: string[]
	documents?: string[]
	embeddings?: number[][]
	metadatas?: Record<string, any>[]
}

interface QueryOptions {
	queryTexts?: string[]
	queryEmbeddings?: number[][]
	nResults: number
	where?: Record<string, any>
	include?: ("documents" | "metadatas" | "embeddings")[]
}

export class ChromaDBService {
	private client: ChromaClient
	private embeddingFunction: OpenAIEmbeddingFunction

	constructor(chromaUrl: string = process.env.BASE_URL_CHROMA as string) {
		console.log("[ChromaDB] Connecting to:", chromaUrl)
		this.client = new ChromaClient({path: chromaUrl})
		console.log("[ChromaDB] Connected to:", chromaUrl)

		this.embeddingFunction = new OpenAIEmbeddingFunction({
			openai_api_key: process.env.OPENAI_API_KEY!,
			openai_model: "text-embedding-3-large"
		})
	}

	async getOrCreateCollection(options: CollectionOptions): Promise<Collection> {
		const name = options.name // use raw static name
		const collection = await this.client.getOrCreateCollection({
			name,
			metadata: options.metadata,
			embeddingFunction: this.embeddingFunction
		})
		logMessage("access", `✅ Collection ready: ${name}`)
		return collection
	}

	async getCollection(name: string): Promise<Collection> {
		const safeName = name
		return await this.client.getCollection({
			name: safeName,
			embeddingFunction: this.embeddingFunction
		})
	}

	async deleteCollection(name: string): Promise<void> {
		const safeName = name
		await this.client.deleteCollection({name: safeName})
		logMessage("access", `🗑️ Deleted collection: ${safeName}`)
	}

	async listCollections(): Promise<string[]> {
		return await this.client.listCollections()
	}

	async addDocuments(
		collectionName: string,
		data: DocumentInput
	): Promise<void> {
		const collection = await this.getCollection(collectionName)
		if (data.documents) {
			await collection.add({
				ids: data.ids,
				documents: data.documents,
				metadatas: data.metadatas
			})
		} else if (data.embeddings) {
			await collection.add({
				ids: data.ids,
				embeddings: data.embeddings,
				metadatas: data.metadatas
			})
		} else {
			throw new Error("Either documents or embeddings must be provided.")
		}
		logMessage("access", `➕ Added documents to ${collectionName}`)
	}

	async updateDocuments(
		collectionName: string,
		data: DocumentInput
	): Promise<void> {
		const collection = await this.getCollection(collectionName)
		await collection.update(data)
	}

	async deleteDocuments(collectionName: string, ids: string[]): Promise<void> {
		const collection = await this.getCollection(collectionName)
		await collection.delete({ids})
	}

	async getDocuments(
		collectionName: string,
		options: {
			ids?: string[]
			where?: Record<string, any>
			limit?: number
			offset?: number
			include?: ("documents" | "metadatas" | "embeddings")[]
		} = {}
	): Promise<any> {
		const collection = await this.getCollection(collectionName)
		const includeCast = options.include?.map((i) => i as IncludeEnum)
		return await collection.get({...options, include: includeCast})
	}

	async queryCollection(
		collectionName: string,
		options: QueryOptions
	): Promise<any> {
		try {
			const collection = await this.getCollection(collectionName)
			const includeCast = options.include?.map((i) => i as IncludeEnum)

			let queryParams: QueryRecordsParams

			if (options.queryTexts) {
				queryParams = {
					queryTexts: options.queryTexts,
					nResults: options.nResults,
					where: options.where,
					include: includeCast
				}
			} else if (options.queryEmbeddings) {
				queryParams = {
					queryEmbeddings: options.queryEmbeddings as [number[]],
					nResults: options.nResults,
					where: options.where,
					include: includeCast
				}
			} else {
				throw new Error(
					"Either queryTexts or queryEmbeddings must be provided."
				)
			}

			const result = await collection.query(queryParams)
			logMessage(
				"access",
				`🔍 Queried ${collectionName}, results: ${result?.ids?.length || 0}`
			)
			return result
		} catch (error: any) {
			logMessage(
				"error",
				`❌ Query failed for ${collectionName}: ${error.message}`
			)
			throw error
		}
	}

	async modifyCollection(
		name: string,
		newName?: string,
		metadata?: Record<string, any>
	): Promise<void> {
		const current = await this.getCollection(name)
		await current.modify({
			name: newName ? toValidChromaName(newName) : undefined,
			metadata
		})
	}

	async countDocuments(collectionName: string): Promise<number> {
		const collection = await this.getCollection(collectionName)
		return await collection.count()
	}

	async countCollections(): Promise<number> {
		return await this.client.countCollections()
	}

	async addEmbeddingWithGeneratedUID(
		collectionName: string,
		data: {
			documents: {pageContent: string; metadata: Record<string, any>}[]
		}
	): Promise<string[]> {
		try {
			const collection = await this.getOrCreateCollection({
				name: collectionName
			})

			if (!data.documents || data.documents.length === 0) {
				throw new Error("Documents are required.")
			}

			const finalIds: string[] = []
			const finalDocs: string[] = []
			const finalMetadatas: Record<string, any>[] = []

			data.documents.forEach((docObj) => {
				const id = toValidChromaName(uuidv4())
				finalIds.push(id)
				finalDocs.push(docObj.pageContent)
				finalMetadatas.push({
					...docObj.metadata,
					referenceUID: id
				})
			})

			await collection.add({
				ids: finalIds,
				documents: finalDocs,
				metadatas: finalMetadatas
			})

			logMessage(
				"access",
				`📥 Added ${finalIds.length} document chunks to ${collectionName}`
			)
			return finalIds
		} catch (error: any) {
			logMessage("error", `❌ ERROR addEmbeddingWithGeneratedUID: ${error}`)
			throw error
		}
	}
}
