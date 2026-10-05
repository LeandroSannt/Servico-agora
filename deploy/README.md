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

## 3. Atualizar (automatico)
Todo push na `main` dispara `.github/workflows/deploy.yml`:
1. `check`: `tsc` e `lint`.
2. `build`: constroi a imagem e publica em `ghcr.io/leandrosannt/servico-agora` (tags `latest` e sha).
3. `deploy`: entra na VPS por SSH e roda `deploy/deploy.sh`, que atualiza o codigo,
   fixa `APP_IMAGE_TAG` no `.env`, baixa a imagem e recria os containers.

Pull requests rodam so o `check`. Tambem da para disparar manualmente em Actions > "CI e Deploy" > Run workflow.

Secrets necessarios no repositorio (Settings > Secrets and variables > Actions):

| Secret | Valor |
|---|---|
| `VPS_HOST` | IP da VPS |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | chave privada exclusiva do Actions (a publica vai em `~deploy/.ssh/authorized_keys`) |
| `VPS_HOST_KEY` | saida de `ssh-keyscan -t ed25519 IP_DA_VPS` |

Rollback: na VPS, `APP_IMAGE_TAG=<sha anterior>` no `.env` e `docker compose -f docker-compose.prod.yml up -d`.

### Atualizar manualmente (fallback)
```bash
cd /opt/servico-agora
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## 4. Dominio e HTTPS
O Caddy ja esta configurado para `servicoagora.com.br` e `www` (variavel `SITE_DOMAIN`).
Basta apontar os registros A de `servicoagora.com.br` e `www` para o IP da VPS; o certificado
e emitido automaticamente em ate alguns minutos. O acesso pelo IP (HTTP) continua funcionando.

## Comandos uteis
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
docker exec -it servico-agora-db psql -U admin -d servico_agora
# backup
docker exec servico-agora-db pg_dump -U admin servico_agora | gzip > backup-$(date +%F).sql.gz
```
