import {Prisma, PrismaClient} from "@prisma/client"
import {DefaultArgs} from "@prisma/client/runtime/library"
import fs from "fs"
import path from "path"

import {logMessage} from "../utils/Logger"

export type PrismaClientTransaction = Omit<
	PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>

export const prisma = new PrismaClient({
	log:
		process.env.NODE_ENV === "development"
			? ["query", "info", "warn", "error"]
			: []
})

export async function runSeeders() {
	try {
		// Access command-line arguments
		const args = process.argv.slice(2)

		// Parse the arguments
		const options = args.reduce((acc, arg) => {
			const [key, value] = arg.split("=")
			acc[key.replace("--", "")] = value
			return acc
		}, {})

		const seederFiles = fs.readdirSync(
			path.join(process.cwd(), `${options["build-dir"]}/seeders`)
		)

		for (const file of seederFiles) {
			const seederModule = await import(
				path.join(process.cwd(), `${options["build-dir"]}/seeders`, file)
			)
			const seeder = seederModule.default
			logMessage("access", `Seeding ${file}...`)
			await seeder(prisma)
		}

		logMessage("access", "All seeders executed successfully!")
		await prisma.$disconnect()
	} catch (error: any) {
		logMessage("error", `Seeding failed: ${error.message}`)
		await prisma.$disconnect()
	}
}
