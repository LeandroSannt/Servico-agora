# Deploy na VPS (Locaweb, Ubuntu 24.04)

## 1. Criar a VPS
Na Locaweb, escolha Ubuntu 24.04, acesso por chave publica e cole o conteudo de
`deploy/cloud-init.yaml` em "Script Cloud-Init". Ele instala Docker, firewall,
swap e cria o usuario `deploy`.

## 2. Primeiro deploy
```bash
ssh deploy@IP_DA_VPS
git clone https://github.com/LeandroSannt/Servico-agora.git /opt/servico-agora
cd /opt/servico-agora
cp deploy/.env.production.example .env
nano .env   # troque POSTGRES_PASSWORD e AUTH_SECRET (openssl rand -base64 32)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f app
```

## 3. Atualizar
```bash
cd /opt/servico-agora
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## 4. Dominio e HTTPS
Aponte um registro A do dominio para o IP da VPS. No `.env`, defina
`SITE_ADDRESS=app.seudominio.com.br`, `AUTH_URL` e `NEXTAUTH_URL` com `https://`.
Depois: `docker compose -f docker-compose.prod.yml up -d`. O Caddy emite o certificado.

## Comandos uteis
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
docker exec -it servico-agora-db psql -U admin -d servico_agora
# backup
docker exec servico-agora-db pg_dump -U admin servico_agora | gzip > backup-$(date +%F).sql.gz
```
