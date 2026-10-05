#!/usr/bin/env bash
# Executado na VPS pelo GitHub Actions: deploy/deploy.sh <ref-git> <tag-da-imagem>
# Atualiza o codigo (compose, Caddyfile), baixa a imagem pronta do GHCR e recria os containers.
set -euo pipefail

REF="${1:-main}"
TAG="${2:-latest}"
APP_DIR=/opt/servico-agora
COMPOSE="docker compose -f docker-compose.prod.yml"

cd "$APP_DIR"

echo "==> Atualizando codigo para $REF"
git fetch --quiet origin "$REF"
git checkout --quiet -B "$REF" "origin/$REF"

echo "==> Fixando imagem na tag $TAG"
if grep -q '^APP_IMAGE_TAG=' .env; then
  sed -i "s|^APP_IMAGE_TAG=.*|APP_IMAGE_TAG=$TAG|" .env
else
  echo "APP_IMAGE_TAG=$TAG" >> .env
fi

if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "==> Login no GHCR"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:-github}" --password-stdin >/dev/null
fi

echo "==> Baixando imagem"
$COMPOSE pull --quiet app

echo "==> Recriando containers"
$COMPOSE up -d --remove-orphans

echo "==> Aguardando aplicacao"
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost/login || true)
  if [ "$code" = "200" ]; then
    echo "OK: /login respondeu 200 apos ${i}0s"
    docker image prune -f >/dev/null
    $COMPOSE ps
    exit 0
  fi
  sleep 10
done

echo "ERRO: aplicacao nao respondeu. Logs:"
$COMPOSE logs --tail=50 app
exit 1
