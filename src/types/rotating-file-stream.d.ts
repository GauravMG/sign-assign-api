declare module "rotating-file-stream" {
	import {Writable} from "stream"

	interface Options {
		size?: string
		interval?: string
		path?: string
		compress?: "gzip" | "brotli" | ((source: string, dest: string) => void)
		maxFiles?: number
		history?: string
		immutable?: boolean
	}

	function createStream(
		filename: string | ((time: Date | null, index: number) => string),
		options?: Options
	): Writable

	export {createStream}
}
