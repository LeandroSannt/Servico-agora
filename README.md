# Serviço Agora

Sistema de Gerenciamento de Ordens de Serviço para assistências técnicas e prestadores de serviço.

## Tecnologias

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Estilização:** Tailwind CSS
- **Backend:** Next.js API Routes
- **Banco de Dados:** PostgreSQL + Prisma ORM
- **Autenticação:** NextAuth.js v5
- **Validação:** Zod + React Hook Form
- **Estado:** TanStack Query (React Query)

## Funcionalidades

- Gestão de Ordens de Serviço (criar, editar, acompanhar status)
- Cadastro de Clientes
- Catálogo de Serviços
- Dashboard com estatísticas
- Sistema multi-empresa e multi-loja
- Controle de acesso por perfil (Super Admin, Admin, Gerente, Funcionário)
- Interface responsiva (mobile e desktop)

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

## Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/servico-agora.git
cd servico-agora
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Copie o arquivo de exemplo e configure suas variáveis:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# Banco de Dados PostgreSQL
DATABASE_URL="postgresql://usuario:senha@localhost:5432/servico_agora?schema=public"

# NextAuth - Gere uma secret segura com: openssl rand -base64 32
AUTH_SECRET="sua-secret-super-segura-aqui"

# URL da aplicação
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Criar o banco de dados

```bash
# Criar banco no PostgreSQL
psql -U postgres -c "CREATE DATABASE servico_agora;"
```

### 5. Executar migrações do Prisma

```bash
# Gerar cliente Prisma e aplicar migrações
npx prisma migrate dev
```

### 6. (Opcional) Popular banco com dados iniciais

```bash
npx prisma db seed
```

### 7. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

## Usuário Padrão (após seed)

```
Email: admin@servicoagora.com
Senha: admin123
```

> ⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Gera build de produção |
| `npm run start` | Inicia servidor de produção |
| `npm run lint` | Executa linter |
| `npx prisma studio` | Abre interface visual do banco |
| `npx prisma migrate dev` | Cria/aplica migrações |
| `npx prisma db push` | Sincroniza schema sem migração |
| `npx prisma generate` | Regenera cliente Prisma |

## Estrutura do Projeto

```
servico-agora/
├── prisma/
│   ├── schema.prisma      # Schema do banco de dados
│   ├── migrations/        # Migrações do banco
│   └── seed.ts           # Dados iniciais
├── src/
│   ├── app/              # App Router (páginas e API)
│   │   ├── (authenticated)/  # Páginas autenticadas
│   │   ├── api/          # API Routes
│   │   └── login/        # Página de login
│   ├── components/       # Componentes React
│   │   ├── forms/        # Formulários
│   │   ├── layout/       # Layout (Sidebar, Header)
│   │   └── ui/           # Componentes base (Button, Input, Modal)
│   ├── hooks/            # Custom hooks
│   │   └── api/          # Hooks de API (React Query)
│   ├── lib/              # Utilitários e configurações
│   │   ├── auth.ts       # Configuração NextAuth
│   │   ├── prisma.ts     # Cliente Prisma
│   │   └── validations/  # Schemas Zod
│   └── types/            # Tipos TypeScript
├── public/               # Arquivos estáticos
└── ...
```

## Perfis de Usuário

| Perfil | Permissões |
|--------|------------|
| **SUPER_ADMIN** | Acesso total, gerencia empresas |
| **COMPANY_ADMIN** | Gerencia lojas e usuários da empresa |
| **MANAGER** | Gerencia OS, clientes e serviços da loja |
| **EMPLOYEE** | Cria e edita OS da loja |

## Deploy

### Vercel (Recomendado)

1. Conecte o repositório na Vercel
2. Configure as variáveis de ambiente
3. Use Neon ou Supabase para PostgreSQL

### Docker

```bash
# Build da imagem
docker build -t servico-agora .

# Executar container
docker run -p 3000:3000 --env-file .env servico-agora
```

### VPS com Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/servico_agora
      - AUTH_SECRET=${AUTH_SECRET}
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=servico_agora
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Problemas Comuns

### Erro de conexão com banco

Verifique se o PostgreSQL está rodando e a `DATABASE_URL` está correta.

```bash
# Testar conexão
npx prisma db pull
```

### Erro "Cannot find module '@prisma/client'"

```bash
npx prisma generate
```

### Porta 3000 em uso

```bash
# Linux/Mac
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
