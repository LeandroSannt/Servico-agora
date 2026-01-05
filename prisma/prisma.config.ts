import path from 'node:path'
import { defineConfig } from 'prisma/config'
import dotenv from 'dotenv'

// Carrega variáveis de ambiente do .env
dotenv.config({ path: path.join(__dirname, '..', '.env') })

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    path: path.join(__dirname, 'migrations'),
    seed: 'npx tsx prisma/seed.ts',
  },
})
