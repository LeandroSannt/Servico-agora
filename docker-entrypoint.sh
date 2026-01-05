#!/bin/sh
set -e

echo "🚀 Iniciando aplicação..."

# Aguarda o banco de dados estar disponível
echo "⏳ Aguardando banco de dados..."
sleep 5

# Roda as migrações do Prisma
echo "📦 Aplicando schema do banco de dados..."
npx prisma db push --url="$DATABASE_URL" --accept-data-loss --skip-generate

# Verifica se precisa rodar o seed (apenas se não existir admin)
echo "🌱 Verificando dados iniciais..."
node -e "
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function checkAndSeed() {
  try {
    const adminExists = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (!adminExists) {
      console.log('🌱 Executando seed...');
      const { execSync } = require('child_process');
      execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
    } else {
      console.log('✅ Dados iniciais já existem');
    }
  } catch (e) {
    console.log('⚠️ Erro ao verificar seed:', e.message);
  } finally {
    await prisma.\$disconnect();
  }
}
checkAndSeed();
" || echo "⚠️ Seed check skipped"

echo "✅ Iniciando servidor Next.js..."
exec node server.js
