#!/bin/sh
set -e

echo "🚀 Iniciando aplicação..."

# Aguarda o banco estar disponível
echo "⏳ Aguardando banco de dados..."
sleep 3

# Aplica as migrações do Prisma automaticamente
echo "📦 Aplicando migrações do banco de dados..."
npx prisma db push --accept-data-loss 2>&1 || echo "⚠️ Aviso: Falha ao aplicar migrações"

echo "✅ Iniciando servidor Next.js..."
exec node server.js
