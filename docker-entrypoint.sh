#!/bin/sh
set -e

echo "🚀 Iniciando aplicação..."

# Aguarda o banco de dados estar disponível
echo "⏳ Aguardando banco de dados..."
sleep 5

# Roda as migrações do Prisma
echo "📦 Aplicando schema do banco de dados..."
node ./node_modules/prisma/build/index.js db push --url="$DATABASE_URL" --accept-data-loss || echo "⚠️ Falha ao aplicar schema, continuando..."

echo "✅ Iniciando servidor Next.js..."
exec node server.js
