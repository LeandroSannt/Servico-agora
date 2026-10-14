# Cliente VIP, catálogo de produtos e equipamentos enriquecidos — Design

Data: 2026-10-14

## Objetivo

1. Marcar clientes como VIP (isentos de cobrança, fora dos gráficos financeiros).
2. Criar catálogo de produtos (menu próprio) e usá-lo na OS, com cadastro inline.
3. Cadastrar equipamento do cliente diretamente na criação/edição da OS.
4. Equipamento com características (tags livres) e fotos.

Fora de escopo: estoque de produtos, storage externo de imagens.

## 1. Cliente VIP

**Dados**
- `Client.isVip Boolean @default(false)` (`is_vip`), `Client.vipCompanyName String?` (`vip_company_name`).
- `ServiceOrder.isVipOrder Boolean @default(false)` (`is_vip_order`): snapshot gravado na criação da OS a partir de `client.isVip`. Mudar o cliente depois não reescreve o histórico.

**Regras**
- `vipCompanyName` só é aceito/persistido quando `isVip = true`; ao desmarcar VIP, é limpo (`null`). Validação Zod: opcional mesmo quando VIP, máx. 120 caracteres.
- Ao criar/editar OS cujo `clientId` é VIP (recalculado no servidor, nunca confiado ao cliente HTTP):
  - Itens (serviços e produtos) mantêm preço normal.
  - `totalAmount = 0` e `isVipOrder = true`.
- Edição de OS preserva `isVipOrder` original; se o cliente da OS for trocado, o snapshot é recalculado do novo cliente.
- Consumo de pacote pré-pago segue como hoje (não há cobrança adicional de qualquer forma).
- **Dashboard/financeiro:** `api/dashboard/stats` e `api/dashboard/charts` excluem `isVipOrder = true` de qualquer soma/série de receita e de rankings de valor (top clientes, top serviços por receita). Contagens operacionais (OS por status, OS ao longo do tempo, novos clientes) continuam incluindo VIP. Helper único em `src/lib/dashboard-scope.ts` para aplicar o filtro de receita.
- `paidAt`/status PAID continuam funcionando; apenas o valor é zero.

**UI**
- `ClientForm`: checkbox "Cliente VIP"; se marcado, input "Nome da empresa".
- Listagem de clientes: `Badge` "VIP" (com nome da empresa, se houver).
- `OrderForm`: ao selecionar cliente VIP, aviso "Cliente VIP: total da OS será R$ 0,00" e total exibido zerado.
- PDF/WhatsApp da OS: total mostrado como R$ 0,00 (consistente com `totalAmount`).

## 2. Catálogo de produtos

**Dados**
```
model Product {
  id, name, description?, price Decimal(10,2), isActive (default true),
  createdAt, updatedAt,
  storeId -> Store (onDelete: Cascade),
  orderProducts OrderProduct[]
  @@index([storeId]); @@map("products")
}
OrderProduct.productId String? -> Product (onDelete: SetNull)
```
- `OrderProduct` continua copiando `name` e `unitPrice` (histórico imutável).

**API** (`/api/products`, `/api/products/[id]`) no padrão de `/api/services`: GET lista (filtro por loja/ativo), POST, PATCH/PUT, DELETE (se usado em OS → desativa em vez de apagar). Mesmo controle de acesso por loja usado em serviços.

**Menu:** item "Produtos" na `Sidebar`, entre Serviços e Pacotes, mesmas roles do item Serviços; página `/products` com tabela, formulário em modal (`ProductForm`), ativar/desativar.

**OS** (`OrderProductsSection`):
- Seletor de produto cadastrado (ativos da loja da OS): preenche nome e preço, ambos editáveis na linha.
- "Novo produto": cria linha avulsa com checkbox "Salvar no catálogo"; ao salvar a OS, se marcado, o servidor cria o `Product` e vincula `productId` (mesma transação).
- Produto avulso sem salvar continua suportado.
- Validação Zod da OS: item de produto aceita `productId?` e `saveToCatalog?`; `productId` deve pertencer à loja da OS.

## 3. Cadastro rápido de equipamento na OS

- `EquipmentPicker` ganha botão "Novo equipamento" abrindo mini-formulário (`QuickEquipmentForm`): nome (obrigatório), marca, modelo, série, cor, características, fotos.
- Cliente já existente: `POST /api/clients/[id]/equipments` e seleção automática do novo equipamento.
- Cliente novo na mesma OS (cadastro rápido de cliente existente): equipamentos ficam pendentes no estado do formulário; ao submeter, cria-se o cliente, depois os equipamentos, depois a OS com os ids reais. Em falha parcial, o erro é mostrado e o que já foi criado é reaproveitado no retry (ids guardados no estado).
- Mesmo formulário reutilizado em `ClientEquipmentsModal` (um único componente de campos).

## 4. Características do equipamento

- `EquipmentTag { id, label (máx. 60), equipmentId -> Equipment (Cascade), @@unique([equipmentId, label]), @@map("equipment_tags") }`.
- Input de chips (Enter/vírgula adiciona, × remove); máx. 20 por equipamento; comparação case-insensitive para evitar duplicatas.
- API de equipamentos aceita `tags: string[]` em POST/PATCH (substitui o conjunto); GET retorna `tags: string[]`.
- Exibidas na listagem do modal de equipamentos e no `EquipmentPicker`.

## 5. Fotos do equipamento

- `EquipmentPhoto { id, data Text (base64 sem prefixo), mimeType, sizeBytes, createdAt, equipmentId -> Equipment (Cascade), @@index([equipmentId]) }`.
- Cliente redimensiona com `resizeImageToDataUrl` (lado máx. 1280px; tipos png/jpeg/webp). Servidor valida mime e tamanho decodificado (≤ 800 KB) e limite de **5 fotos por equipamento**.
- Endpoints sob `/api/clients/[id]/equipments/[equipmentId]/photos`: POST (adiciona), DELETE `/[photoId]`, GET `/[photoId]` (stream da imagem com `Content-Type` e cache privado). Acesso via `requireClientAccess`.
- A listagem de equipamentos retorna apenas `photos: [{ id }]` (sem base64); a UI usa a URL do GET como `src`.
- Durante a criação (equipamento ainda sem id), as fotos ficam no estado e são enviadas logo após o POST do equipamento.
- Arquivar equipamento (regra existente) não apaga fotos.

## Migração e compatibilidade

- Uma migration Prisma aditiva: colunas com default, tabelas novas, sem backfill necessário (`isVip=false`, `isVipOrder=false`).
- Todas as FKs novas seguem a regra do projeto (Cascade; `SetNull` apenas em `OrderProduct.productId` para preservar histórico).
- Rodar Prisma com `--config` conforme ambiente local (ver memória do projeto).

## Testes

- Unitários (vitest): cálculo de total VIP; filtro de receita VIP no dashboard-scope; validações Zod (VIP, produto com `productId`/`saveToCatalog`, tags, foto: mime/tamanho/limite); normalização de tags (dedupe case-insensitive).
- Rotas: acesso por loja em produtos/fotos; `productId` de outra loja rejeitado; DELETE de produto usado desativa.
- Build (`next build`) e testes existentes devem continuar passando; manter o modelo do PDF de OS coberto.

## Entrega

Quatro PRs a partir de `origin/main`, nesta ordem, para revisão incremental:
1. VIP (schema + regras + dashboard + UI).
2. Catálogo de produtos (schema + API + menu + OS).
3. Equipamento: características e fotos.
4. Cadastro rápido de equipamento (e cliente novo) na OS.

Cada PR traz sua própria migration.
