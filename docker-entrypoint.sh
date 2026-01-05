#!/bin/sh
set -e

echo "🚀 Iniciando aplicação..."

# Aguarda o banco estar disponível
echo "⏳ Aguardando banco de dados..."
sleep 3

# Aplica as migrações do Prisma automaticamente
echo "📦 Aplicando migrações do banco de dados..."
if [ -n "$DATABASE_URL" ]; then
  npx prisma db push --url="$DATABASE_URL" --accept-data-loss 2>&1 || echo "⚠️ Aviso: Falha ao aplicar migrações"
else
  echo "⚠️ DATABASE_URL não definida, pulando migrações"
fi

echo "✅ Iniciando servidor Next.js..."
exec node server.js
