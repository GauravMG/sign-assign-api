import {PrismaClient} from "@prisma/client"
import {DefaultData, VerificationType} from "../types/auth"
import {logMessage} from "../utils/Logger"

const prisma = new PrismaClient({
	log:
		process.env.NODE_ENV === "development"
			? ["query", "info", "warn", "error"]
			: []
})

async function seedSuperadminUser() {
	try {
		const user: any = {
			roleId: 1,
			firstName: "Super",
			lastName: "Admin",
			email: DefaultData.superAdminEmail,
			password: "$2b$10$yWUD0Y6pEb2u63mpmaTr/OW6itGmr6qFTZqtiWnfoeKKgRRyaYLti"
		}

		const createdUser = await prisma.user.upsert({
			where: {email: user.email},
			update: {},
			create: {
				...user
			}
		})

		if (createdUser) {
			const verificationExists = await prisma.verification.findFirst({
				where: {
					userId: createdUser.userId,
					verificationType: VerificationType.Registration // Adjust the verification type if needed
				}
			})

			if (!verificationExists) {
				const verification: any = {
					userId: createdUser.userId,
					verificationType: VerificationType.Registration,
					deletedAt: new Date(),
					deletedById: createdUser.userId
				}

				await prisma.verification.create({
					data: {
						...verification
					}
				})
			}
		}

		logMessage("access", "Superadmin user seeding completed!")
	} catch (error) {
		if (error instanceof Error) {
			logMessage("error", `${error.message}`)
		} else {
			logMessage("error", `An unknown error occurred`)
		}
	}
}

export default seedSuperadminUser
