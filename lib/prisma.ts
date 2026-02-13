import { PrismaClient } from '@prisma/client'

type GlobalForPrisma = typeof globalThis & { prisma?: PrismaClient }
const globalForPrisma = globalThis as GlobalForPrisma

function createPrismaClient() {
	try {
		return new PrismaClient()
	} catch (err) {
		// Don't throw during module initialization; return a proxy that throws on access.
		// This prevents Next.js dev server from crashing or stalling when the DB is unavailable.
		// Real errors will surface when the app actually tries to use Prisma.
		console.error('[prisma] initialization failed:', err)
		return new Proxy({}, {
			get() {
				throw new Error('Prisma client is not available. See server logs for details.')
			}
		}) as PrismaClient
	}
}

if (!globalForPrisma.prisma) {
	globalForPrisma.prisma = createPrismaClient()
}

export const prisma: PrismaClient = globalForPrisma.prisma as PrismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
