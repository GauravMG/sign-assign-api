import {ChromaDBService} from "../services/ChromaDBService"
import {logMessage} from "./Logger"
import {ChromaDocument, extractTextFromWebPage} from "./WebScraper"

const collectionName = "website_data"
const chromaDBService: ChromaDBService = new ChromaDBService()

const webLinks: string[] = [
	// "http://3.109.198.252/about-us",
	// "http://3.109.198.252/contact-us",
	// "http://3.109.198.252/services",
	"http://3.109.198.252/privacy-policy",
	"http://3.109.198.252/terms-of-use"
]

export async function vectoriseSiteData() {
	try {
		try {
			const existingCollection =
				await chromaDBService.getCollection(collectionName)
			if (existingCollection) {
				await chromaDBService.deleteCollection(collectionName)
			}
		} catch (errorTemp) {
			console.log(`errorTemp`)
		}
		await chromaDBService.getOrCreateCollection({name: collectionName})

		let documents: ChromaDocument[] = await extractTextFromWebPage(webLinks)

		await chromaDBService.addEmbeddingWithGeneratedUID(collectionName, {
			documents
		})

		const createdDocuments = await chromaDBService.getDocuments(collectionName)
	} catch (error: any) {
		logMessage("error", `❌ ERROR vectoriseSiteData: ${error.message}`)
	}
}
