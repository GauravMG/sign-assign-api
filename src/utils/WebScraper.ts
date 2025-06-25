import axios from "axios"
import {XMLParser} from "fast-xml-parser"
import {load} from "cheerio"

import {logMessage} from "../utils/Logger"
import {chunkTextByTokens} from "../helpers"

export interface ChromaDocument {
	pageContent: string
	metadata: {
		source: string
	}
}

/**
 * Recursively extracts URLs from a sitemap or sitemap index.
 * @param sitemapUrl - The URL of the sitemap
 */
export async function extractURLFromSitemapURL(
	sitemapUrl: string
): Promise<string[]> {
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: ""
	})
	try {
		const res = await axios.get(sitemapUrl)
		const parsed = parser.parse(res.data)

		// Case 1: Sitemap Index — contains <sitemap>
		if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
			const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
				? parsed.sitemapindex.sitemap
				: [parsed.sitemapindex.sitemap]

			// Recursively resolve each nested sitemap
			const nestedUrls = await Promise.all(
				sitemaps.map((s: any) => extractURLFromSitemapURL(s.loc))
			)
			return nestedUrls.flat()
		}

		// Case 2: URL Set — contains <url>
		if (parsed.urlset && parsed.urlset.url) {
			const urls = Array.isArray(parsed.urlset.url)
				? parsed.urlset.url
				: [parsed.urlset.url]

			return urls.map((u: any) => u.loc)
		}

		throw new Error("Invalid sitemap format.")
	} catch (error: any) {
		logMessage("error", `❌ ERROR extractURLFromSitemapURL: ${error.message}`)
		throw new Error("Failed to parse sitemap.")
	}
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function extractTextFromWebPage(
	path: string[] | string
): Promise<ChromaDocument[]> {
	const urls = typeof path === "string" ? JSON.parse(path) : path
	const documents: ChromaDocument[] = []

	for (const url of urls) {
		try {
			console.log(`scraping url: ${url}`)
			const {data} = await axios.get(url)
			const $ = load(data)
			$("script, style, noscript").remove()
			const bodyText = $("body").text().replace(/\s+/g, " ").trim()

			const chunks = chunkTextByTokens(bodyText)

			for (const chunk of chunks) {
				documents.push({
					pageContent: chunk,
					metadata: {
						source: url
					}
				})
			}

			console.log(`scraped and chunked url: ${url}`)
		} catch (error) {
			console.error(`Failed to scrape: ${url}`, error)
			documents.push({
				pageContent: "",
				metadata: {
					source: url
				}
			})
		}

		await sleep(1000)
	}

	return documents
}
