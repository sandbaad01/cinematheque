import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || ''

  // Check if using Turso (libSQL) — URL starts with "libsql://"
  // or is a Vercel/remote database
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('https://')) {
    // Turso / libSQL database (for web deployment on Vercel)
    // Pass the config object directly to the adapter
    const authToken = process.env.DATABASE_AUTH_TOKEN || ''
    const adapter = new PrismaLibSql({
      url: databaseUrl,
      authToken: authToken || undefined,
    })
    return new PrismaClient({ adapter, log: ['error', 'warn'] } as any)
  }

  // Local SQLite (for desktop / dev)
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
