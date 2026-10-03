# WhatsApp: provedor Meta (WhatsApp Cloud API)

**Data:** 2026-10-03

## Problema

As notificações de OS por WhatsApp usam a Evolution API (instância não oficial conectada por QR Code). Queremos usar a API oficial da Meta (WhatsApp Cloud API) mantendo o mesmo funcionamento para o usuário: notificação automática a cada mudança de status da OS e envio do PDF quando a OS é paga, com configuração por empresa, templates por status, logs e mensagem de teste.

## Restrição da Meta que muda o desenho

Fora da janela de 24h aberta por uma mensagem do **cliente**, a Meta só aceita mensagens do tipo **template**, pré-aprovadas no Meta Business Manager, com variáveis numeradas `{{1}}`..`{{n}}`. Variáveis não podem conter quebra de linha, tabulação ou mais de 4 espaços seguidos. Mudar o texto fixo exige reaprovação. Decisão aprovada pelo usuário: usar templates da Meta com as variáveis preenchidas pelo sistema.

## Objetivo

1. Camada de provedor: regras do sistema (config, escolha de template, dados da OS, log) separadas da comunicação com o provedor.
2. Provedor Meta com envio de template, envio de PDF e teste de conexão.
3. Criação automática dos templates na Meta a partir dos textos padrão atuais, com acompanhamento do status de aprovação.
4. Tela de administração adaptada; rotas de OS inalteradas.
5. Modo de simulação local, pois ainda não há credenciais da Meta.

## Fora de escopo

- Webhook da Meta para marcar Entregue/Lida nos logs (o campo do ID da mensagem fica pronto para isso).
- Receber mensagens dos clientes.
- Remover o código da Evolution: ele vira um provedor e continua selecionável.
- Testes automatizados (o projeto não tem runner).

## Ambiente

Node 22 (`engines >=22.12`, `node:22-alpine`). HTTP com axios 1.13 usando `FormData`/`Blob` globais do Node; **não** instalar `form-data`.

## Banco de dados (`prisma/schema.prisma`)

```prisma
enum WhatsAppProviderType {
  EVOLUTION
  META
}

enum MetaTemplateStatus {
  NOT_CREATED  // ainda não enviado à Meta
  PENDING      // em análise (inclui IN_APPEAL)
  APPROVED
  REJECTED     // inclui DISABLED, PENDING_DELETION, DELETED, LIMIT_EXCEEDED, com o status da Meta em metaRejectReason
  PAUSED       // Meta pausou por qualidade
}

model WhatsAppConfig {
  // existentes...
  provider          WhatsAppProviderType @default(EVOLUTION)
  // Evolution (passam a opcionais)
  instanceName      String?  @map("instance_name")
  apiKey            String?  @map("api_key")
  apiUrl            String   @default("http://localhost:8080") @map("api_url")
  // Meta
  metaPhoneNumberId String?  @map("meta_phone_number_id")
  metaWabaId        String?  @map("meta_waba_id")
  metaAccessToken   String?  @map("meta_access_token")
  metaAppId         String?  @map("meta_app_id")   // necessário só para criar o template PAID (cabeçalho de documento)
}

model MessageTemplate {
  // existentes...
  metaTemplateName String?            @map("meta_template_name")
  metaLanguage     String             @default("pt_BR") @map("meta_language")
  metaStatus       MetaTemplateStatus @default(NOT_CREATED) @map("meta_status")
  metaRejectReason String?            @map("meta_reject_reason")
}

model MessageLog {
  // existentes...
  providerMessageId String? @map("provider_message_id")
}
```

- `triggerStatus` passa a aceitar `PAID` (o enum `OrderStatus` já tem). O template `PAID` tem cabeçalho de documento e carrega o PDF.
- Aplicação: `prisma db push` em dev; o `docker-entrypoint.sh` já roda `prisma db push` no deploy. Tornar `instanceName`/`apiKey` opcionais e adicionar colunas com default não perde dados. O enum do Prisma chama-se `WhatsAppProviderType` para não colidir com a interface TypeScript `MessagingProvider`.

## Validações (`src/lib/validations/whatsapp.ts`)

- `whatsappConfigSchema` vira `z.discriminatedUnion('provider', [...])`:
  - `EVOLUTION`: `instanceName`, `apiKey` (opcional no PUT, ver abaixo), `apiUrl`, `companyId`.
  - `META`: `metaPhoneNumberId`, `metaWabaId` obrigatórios; `metaAccessToken` obrigatório no POST e opcional no PUT (vazio/ausente mantém o atual); `metaAppId` opcional; `apiUrl` opcional (default do banco); `companyId`.
  - Para o PUT, usar `whatsappConfigUpdateSchema` = mesma união com `apiKey` e `metaAccessToken` opcionais e **sem** `companyId` (vem de `existingConfig`); `id` é lido do body fora do schema. `provider` é obrigatório no POST e no PUT (a união não tem default; o seletor da tela sempre envia).
  - Regra de segredo resultante no PUT: se o provedor resultante for META e nem o body nem o registro atual tiverem `metaAccessToken` → `400 { error: 'Token de acesso é obrigatório' }`; idem EVOLUTION com `apiKey` → `400 { error: 'API Key é obrigatória' }`. Só depois disso chama-se `checkConnection()`.
- `messageTemplateSchema`: `triggerStatus: z.enum(['RECEIVED','IN_PROGRESS','PAUSED','FINISHED','PAID'])`; `content` opcional (o handler exige `min(10)` só quando o config é Evolution); novos campos opcionais `metaTemplateName` (regex `^[a-z0-9_]{1,512}$`) e `metaLanguage`.
- `defaultTemplates` ganha a entrada `PAID` com o texto atual da legenda de pagamento:

```
💚 *Pagamento Confirmado!*

Olá, *{{clientName}}*!

Agradecemos pela preferência! Seu pagamento foi confirmado.

📋 *OS:* #{{orderNumber}}
💰 *Total:* R$ {{totalAmount}}

Segue em anexo o comprovante da sua ordem de serviço.

_{{companyName}}_
_Obrigado pela confiança!_
```

`defaultTemplates` de validations passa a ser a **única** fonte dos textos padrão; `generateDefaultMessage` e `defaultTemplates` de `evolution-api.ts` são removidos (onde os títulos divergem, vale o de validations: "Serviço Em Andamento").

## Camada de provedor (`src/lib/whatsapp/`)

```
src/lib/whatsapp/
  index.ts             # API pública: sendOrderStatusWhatsApp, sendOrderPaidWhatsApp, checkWhatsAppConnection,
                       #   getWhatsAppQRCode, disconnectWhatsApp (Evolution), syncMetaTemplates, refreshMetaTemplateStatus
  types.ts             # MessagingProvider, TemplateRef, SendResult, OrderStatusMessageData, OrderPaidMessageData
  message-data.ts      # formatPhoneNumber, buildVariables, renderText, toMetaParams, sanitizeParam, metaTemplateName, metaTemplateBodies
  resolve-provider.ts  # escolhe o provedor pela config da empresa ou pelo .env global
  providers/
    evolution.ts       # chamadas HTTP à Evolution (texto, mídia, estado, QR, logout), sem regra de negócio
    meta.ts            # Cloud API: sendTemplate, sendDocumentTemplate, checkConnection, createTemplates, getTemplateStatuses
    meta-mock.ts       # mesma interface; só loga e devolve sucesso
```

### Tipos

```ts
type SendResult = { ok: boolean; providerMessageId?: string; error?: string }

type TemplateRef =
  | { kind: 'text'; text: string }                                  // Evolution: texto já renderizado
  | { kind: 'meta'; name: string; language: string; params: string[] }  // Meta: template aprovado + variáveis

interface MessagingProvider {
  readonly name: 'EVOLUTION' | 'META' | 'META_MOCK'
  sendMessage(input: { phone: string; template: TemplateRef }): Promise<SendResult>
  sendDocument(input: { phone: string; template: TemplateRef; pdf: Buffer; fileName: string }): Promise<SendResult>
  checkConnection(): Promise<{ connected: boolean; phoneNumber?: string | null; error?: string }>
  // Só Evolution (opcionais na interface):
  ensureInstanceAndGetQRCode?(): Promise<string | null>   // cria a instância se não existir e devolve o QR em base64
  disconnect?(): Promise<void>
  // Só Meta (opcionais):
  createTemplates?(defs: MetaTemplateDefinition[]): Promise<MetaTemplateResult[]>
  getTemplateStatuses?(names: string[]): Promise<Record<string, { status: string; rejectedReason?: string }>>
}
```

### `message-data.ts`

- `formatPhoneNumber`: a atual (55 + DDD + número, só dígitos).
- `buildVariables(data)`: aceita `OrderStatusMessageData | OrderPaidMessageData` e devolve `Record<'clientName'|'orderNumber'|'storeName'|'companyName'|'services'|'totalAmount'|'pausedReason'|'status', string>`.
- `renderText(content, vars)`: semântica atual de `replaceTemplateVariables` (serviços em várias linhas `  • Nome (2x) - R$ 40.00`, total `toFixed(2)`, `pausedReason` com prefixo `\n📝 *Motivo:* ...\n` ou vazio).
- `toMetaParams(status, vars): string[]`: ordem da tabela abaixo, cada item por `sanitizeParam` (remove `\r\n\t`, colapsa espaços, `trim`, corta em 1000 chars). Serviços em uma linha: `Nome (2x) R$ 40,00; Outro (1x) R$ 15,00`. Total `1.234,56` (pt-BR, sem "R$").
- `metaTemplateName(status, companyId)` = `os_<status minúsculo>_<6 últimos chars do companyId>`.
- `metaTemplateBodies(companyName)`: textos dos 5 templates com `{{n}}` e os exemplos, listados em "Textos dos templates Meta".

| Status | {{1}} | {{2}} | {{3}} | {{4}} | {{5}} | {{6}} |
|---|---|---|---|---|---|---|
| RECEIVED, IN_PROGRESS, FINISHED | clientName | orderNumber | storeName | services | totalAmount | — |
| PAUSED | clientName | orderNumber | storeName | services | totalAmount | pausedReason ou "Não informado" |
| PAID (cabeçalho: documento) | clientName | orderNumber | totalAmount | — | — | — |

O nome da empresa entra no texto fixo (template é por empresa), não como variável.

### Textos dos templates Meta (`metaTemplateBodies`)

Regras de derivação a partir de `defaultTemplates`: `{{services}}` vira uma única linha após "*Serviços:* "; `{{pausedReason}}` vira a linha fixa `📝 *Motivo:* {{6}}`; `{{companyName}}` vira o nome literal da empresa; as linhas "_Mensagem automática - Não responda_" e a frase de retirada do FINISHED permanecem. Exemplos (`example.body_text`): `["Maria Silva", "1042", "Loja Centro", "Troca de tela (1x) R$ 350,00", "350,00"]`, mais `"Aguardando peça"` no PAUSED; PAID: `["Maria Silva", "1042", "350,00"]`.

RECEIVED (`os_received_<id6>`):
```
📥 *Serviço Recebido*

Olá, *{{1}}*!

Recebemos sua ordem de serviço e em breve iniciaremos o atendimento.

📋 *Ordem de Serviço:* #{{2}}
🏪 *Loja:* {{3}}

*Serviços:* {{4}}

💰 *Total:* R$ {{5}}

_<Empresa>_
_Mensagem automática - Não responda_
```

IN_PROGRESS (`os_in_progress_<id6>`):
```
🔧 *Serviço Em Andamento*

Olá, *{{1}}*!

Seu serviço está sendo realizado pela nossa equipe.

📋 *Ordem de Serviço:* #{{2}}
🏪 *Loja:* {{3}}

*Serviços:* {{4}}

💰 *Total:* R$ {{5}}

_<Empresa>_
_Mensagem automática - Não responda_
```

PAUSED (`os_paused_<id6>`):
```
⏸️ *Serviço Pausado*

Olá, *{{1}}*!

Seu serviço está pausado.
📝 *Motivo:* {{6}}

📋 *Ordem de Serviço:* #{{2}}
🏪 *Loja:* {{3}}

*Serviços:* {{4}}

💰 *Total:* R$ {{5}}

_<Empresa>_
_Mensagem automática - Não responda_
```

FINISHED (`os_finished_<id6>`):
```
✅ *Serviço Finalizado*

Olá, *{{1}}*!

Seu serviço foi concluído e está pronto para retirada!

📋 *Ordem de Serviço:* #{{2}}
🏪 *Loja:* {{3}}

*Serviços:* {{4}}

💰 *Total:* R$ {{5}}

🎉 Por favor, compareça à nossa loja para retirar seu produto/serviço.

_<Empresa>_
_Mensagem automática - Não responda_
```

PAID (`os_paid_<id6>`, cabeçalho DOCUMENT):
```
💚 *Pagamento Confirmado!*

Olá, *{{1}}*!

Agradecemos pela preferência! Seu pagamento foi confirmado.

📋 *OS:* #{{2}}
💰 *Total:* R$ {{3}}

Segue em anexo o comprovante da sua ordem de serviço.

_<Empresa>_
_Obrigado pela confiança!_
```

### Regras em `index.ts` (as atuais, agora independentes do provedor)

1. Buscar `WhatsAppConfig` da empresa com templates ativos do status. Sem config: provedor global do `.env` (abaixo). Com config e `isConnected = false`: não envia, retorna `false`.
2. Escolher template:
   - **Evolution:** template ativo → `renderText(content)`; sem template ativo → `renderText(defaultTemplates[status].content)` (comportamento atual).
   - **Meta:** template ativo com `metaStatus = APPROVED` → `{ kind: 'meta', name, language, params }`. Template ativo mas não aprovado → não envia; grava `MessageLog FAILED` com `errorMessage = 'Template Meta não aprovado (status <X>)'`. Template inativo ou inexistente → não envia (sem fallback), log `FAILED` com `'Template Meta inativo'`.
   - **Meta global (sem config):** nome padrão `metaTemplateName(status, 'global')` em `pt_BR`, assumindo aprovado; sem log (não há `whatsappConfigId`).
3. Chamar `provider.sendMessage` / `provider.sendDocument` (PAID gera o PDF com `generateOrderPdf` e envia `fileName = OS_<n>.pdf`).
4. Gravar `MessageLog` quando há config: `status` `SENT`/`FAILED`, `errorMessage`, `providerMessageId`, `orderNumber`, `phone` formatado, e `message`:
   - Evolution: texto enviado (como hoje); PAID: `[PDF] OS_<n>.pdf - <legenda>`.
   - Meta: `[META <name>/<language>] {{1}}=...; {{2}}=...`; PAID: `[PDF] OS_<n>.pdf [META <name>/<language>] {{1}}=...`.
   - Meta, `FAILED` sem envio (template não aprovado/inativo): `message = '[META <name>/<language>] (não enviado)'`, com o motivo em `errorMessage`.
5. `checkWhatsAppConnection(companyId?)`: `provider.checkConnection()` e grava `isConnected`/`phoneNumber` na config.

### Resolução do provedor (`resolve-provider.ts`)

- Config `provider = META` → `MetaProvider(config)`; se `META_MOCK === 'true'`, `MetaMockProvider`.
- Config `provider = EVOLUTION` → `EvolutionProvider(config)`.
- Sem config: `WHATSAPP_PROVIDER` (`META` | `EVOLUTION`, padrão `EVOLUTION`) com `META_PHONE_NUMBER_ID`, `META_WABA_ID`, `META_ACCESS_TOKEN`, `META_APP_ID` ou as `EVOLUTION_*` atuais.

### Provedor Meta (`providers/meta.ts`)

- Base `https://graph.facebook.com/<versão>`; versão em `META_GRAPH_API_VERSION` (padrão `v21.0`). `Authorization: Bearer <token>`. Timeout 30s (60s em mídia). Telefone via `formatPhoneNumber`.
- **sendMessage** (`kind: 'meta'`): `POST /{phoneNumberId}/messages`
  ```json
  { "messaging_product": "whatsapp", "to": "<phone>", "type": "template",
    "template": { "name": "<name>", "language": { "code": "pt_BR" },
      "components": [ { "type": "body", "parameters": [ { "type": "text", "text": "<p1>" }, ... ] } ] } }
  ```
  Sucesso quando `messages[0].id` existe → `providerMessageId`.
- **sendDocument**: 1) `POST /{phoneNumberId}/media` multipart com `messaging_product=whatsapp`, `type=application/pdf`, `file=<Blob do PDF>` (nome do arquivo no `append`) → `{ id }`; 2) `POST /{phoneNumberId}/messages` com
  ```json
  "components": [
    { "type": "header", "parameters": [ { "type": "document", "document": { "id": "<mediaId>", "filename": "OS_123.pdf" } } ] },
    { "type": "body", "parameters": [ { "type": "text", "text": "<p1>" }, ... ] } ]
  ```
- **checkConnection**: `GET /{phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`. OK → `{ connected: true, phoneNumber: dígitos de display_phone_number }`. Erro com `error.code === 190` (qualquer HTTP) → `{ connected: false, error: 'Token inválido ou expirado' }`; outros → `error.message` da Meta.
- **createTemplates(defs)**: para cada def, `POST /{wabaId}/message_templates`:
  ```json
  { "name": "os_finished_a1b2c3", "category": "UTILITY", "language": "pt_BR",
    "components": [ { "type": "BODY", "text": "...{{1}}...{{5}}...",
      "example": { "body_text": [ ["Maria Silva", "1042", "Loja Centro", "Troca de tela (1x) R$ 350,00", "350,00"] ] } } ] }
  ```
  `parameter_format` omitido (posicional). PAID adiciona antes do BODY: `{ "type": "HEADER", "format": "DOCUMENT", "example": { "header_handle": ["<h>"] } }`, com `<h>` do upload resumível. Resposta `{ id, status }`. Se a Meta responder que o nome já existe (`error.error_subcode === 2388024` **ou** mensagem contendo "already exists"), consultar `GET /{wabaId}/message_templates?name=<name>&fields=name,status,rejected_reason` e usar o status retornado.
- **getTemplateStatuses(names)**: `GET /{wabaId}/message_templates?fields=name,status,rejected_reason&limit=100` (seguir `paging.next` se houver), filtrando pelos nomes. Mapeamento para `MetaTemplateStatus`: `APPROVED→APPROVED`; `PENDING`, `IN_APPEAL→PENDING`; `REJECTED→REJECTED` (`metaRejectReason = rejected_reason`); `PAUSED→PAUSED`; demais (`DISABLED`, `PENDING_DELETION`, `DELETED`, `LIMIT_EXCEEDED`) → `REJECTED` com `metaRejectReason = <status da Meta>`; ausente na listagem → `NOT_CREATED`.
- **Upload resumível (header_handle do PAID)**: `POST /{appId}/uploads?file_name=exemplo.pdf&file_length=<bytes>&file_type=application/pdf` com `Authorization: OAuth <token>` → `{ id }`; `POST /{uploadSessionId}` com `Authorization: OAuth <token>`, `file_offset: 0`, corpo binário → `{ h }`. O PDF de exemplo vem de `generateOrderPdf` com dados fictícios. Sem `metaAppId`: PAID não é criado, fica `NOT_CREATED` com `metaRejectReason = 'Informe o App ID para criar o template com documento'`.
- Erros: `errorMessage` = `error.message` + (`error.error_data.details` se houver) + `[code/subcode]`.

### Mock (`providers/meta-mock.ts`)

`META_MOCK=true`. Loga `[WhatsApp:META_MOCK]` com template, variáveis e nome do arquivo; devolve `{ ok: true, providerMessageId: 'mock-<timestamp>' }`. `checkConnection` → `{ connected: true, phoneNumber: '5500000000000' }`. `createTemplates` → todos `APPROVED`; `getTemplateStatuses` → `APPROVED` para todos.

## API

- **`/api/whatsapp/config`**
  - `GET`: `null` sem config; senão `{ ...sanitizeConfig(config), mock: META_MOCK === 'true' }`. `sanitizeConfig` remove `metaAccessToken` e `apiKey` e adiciona `hasMetaAccessToken`, `metaAccessTokenHint` (4 últimos chars) e `hasApiKey`. `POST` e `PUT` também devolvem `sanitizeConfig`.
  - `POST`: valida com a união; cria config e os **5** templates de `defaultTemplates` (`isDefault = true`); para Meta, `metaTemplateName = metaTemplateName(status, companyId)`, `metaStatus = NOT_CREATED`. Com `provider = META`, chama `checkConnection()` e persiste `isConnected`/`phoneNumber`.
  - `PUT`: valida com `whatsappConfigUpdateSchema`; `metaAccessToken`/`apiKey` vazios mantêm o atual. Trocar o provedor zera `isConnected`/`phoneNumber`. Com `provider = META`: garante os 5 templates (cria os ausentes de `defaultTemplates`), preenche `metaTemplateName` nulo e chama `checkConnection()`. Voltar para EVOLUTION mantém os templates.
- **`/api/whatsapp/qrcode`**
  - `POST` (verificar conexão): mantém as guardas atuais (`400` sem empresa, `403` sem permissão, `404` sem config); o resultado da verificação é sempre `200 { connected, state: 'open' | 'disconnected', phoneNumber?, error? }`, via `checkWhatsAppConnection(companyId)`.
  - `GET` (QR) e `DELETE` (desconectar): com Meta → `400 { error: 'Operação disponível apenas para o provedor Evolution' }`. Com Evolution, o fluxo atual de criar a instância (`POST /instance/create` com `integration: 'WHATSAPP-BAILEYS'`, tentativa de novo em 404) e obter o QR passa para o provedor como `ensureInstanceAndGetQRCode?(): Promise<string | null>` (substitui `getQRCode?`); a rota só valida permissão, carrega a config (agora com `instanceName`/`apiKey` não nulos garantidos pela validação do ramo EVOLUTION) e chama o provedor. `DELETE` chama `disconnect?()` (`/instance/logout`).
- **`/api/whatsapp/templates`**: `PUT` com Meta ignora `content` e aceita `isActive`, `metaTemplateName`, `metaLanguage`; com Evolution, `content` obrigatório (`min 10`).
- **`/api/whatsapp/templates/sync`** (novo): `POST { companyId }` cria na Meta os templates ativos com `metaStatus` `NOT_CREATED` ou `REJECTED` e grava o resultado; `GET ?companyId=` consulta os status e atualiza. Ambos `SUPER_ADMIN`/`COMPANY_ADMIN`, mesma checagem de empresa das outras rotas; `400` se o provedor não for Meta.
- **`/api/whatsapp/test`**: `POST { phone, companyId }`; segue chamando `sendOrderStatusWhatsApp` com `FINISHED`.
- **`/api/whatsapp/status`** (global): usa o provedor do `.env`; inclui `mock` e só traz `qrCode` com Evolution.

## Hooks (`src/hooks/api/use-whatsapp.ts`)

- Tipo `WhatsAppConfig`: perde `apiKey`; ganha `provider`, `metaPhoneNumberId`, `metaWabaId`, `metaAppId`, `hasMetaAccessToken`, `metaAccessTokenHint`, `hasApiKey`, `mock`.
- Tipo `MessageTemplate`: ganha `metaTemplateName`, `metaLanguage`, `metaStatus`, `metaRejectReason`.
- `ConnectionStatusResponse` ganha `error?`.
- Novos: `useSyncMetaTemplates()` (POST sync), `useRefreshMetaTemplateStatus()` (GET sync). `useTestWhatsAppMessage` passa a enviar `{ phone, companyId }`.

## Tela de administração (`src/app/(authenticated)/admin/whatsapp/page.tsx`)

- Modal de configuração: seletor "Provedor" (Evolution | Meta). Com Meta: campos Phone Number ID, WABA ID, App ID (opcional, ajuda: "necessário para o template de OS paga com PDF") e Token de acesso (`type="password"`, placeholder `•••• <hint>` quando já existe; vazio mantém). Com Evolution: comportamento atual (instância gerada, chave do ambiente).
- Aba "Configuração": card mostra provedor e, com Meta, Phone Number ID, WABA ID, App ID e "Token: configurado (…abcd)". Token nunca aparece inteiro.
- Aba "QR Code" vira "Conexão". Com Meta: botão "Testar conexão" (POST `/qrcode`); mostra número verificado e status, e `error` em vermelho quando `connected = false`; sem QR nem Desconectar. Abaixo, "Mensagem de teste": campo telefone + botão que chama `POST /api/whatsapp/test` com `{ phone, companyId }` e mostra o resultado. Com Evolution: QR e Desconectar como hoje, mais a mesma caixa de mensagem de teste.
- Aba "Templates", com Meta: botões no topo "Criar templates na Meta" e "Atualizar status". Cada card mostra `metaTemplateName`, idioma, badge de `metaStatus` (`Não criado`, `Em análise`, `Aprovado`, `Rejeitado` + motivo, `Pausado`) e a pré-visualização **somente leitura** do texto com `{{n}}` (`metaTemplateBodies`); sem botão de editar texto; aviso "O texto é editado no Meta Business Manager; após alterar, clique em Atualizar status". Ativar/desativar continua. Com Evolution: como hoje, agora com 5 templates (inclui Pago).
- Banner "Modo de simulação ativo (META_MOCK)" quando `config?.mock` for `true` ou, sem config, quando `GET /api/whatsapp/status` devolver `mock: true`.

## Rotas de OS

`src/app/api/orders/route.ts` e `src/app/api/orders/[id]/route.ts` só trocam o import de `@/lib/whatsapp/evolution-api` para `@/lib/whatsapp`. Nenhuma lógica muda.

## `.env.example`

Seção WhatsApp documenta `WHATSAPP_PROVIDER`, `META_GRAPH_API_VERSION`, `META_PHONE_NUMBER_ID`, `META_WABA_ID`, `META_ACCESS_TOKEN`, `META_APP_ID`, `META_MOCK`, mantém as `EVOLUTION_*` e **adiciona** `NEXT_PUBLIC_EVOLUTION_API_URL`/`NEXT_PUBLIC_EVOLUTION_API_KEY` (hoje usadas pela tela, mas ausentes do exemplo).

## Verificação (manual, com `META_MOCK=true` no `.env`)

1. `npx prisma db push --config prisma/prisma.config.ts` aplica o schema; `npx tsc --noEmit` e `npm run lint` limpos.
2. Admin > WhatsApp: criar config Meta para a empresa com IDs e token fictícios. Salva; a resposta e o card não mostram o token (só "…<4 chars>"); `isConnected` já verdadeiro (mock).
3. Aba Conexão: "Testar conexão" mostra conectado com `5500000000000`. Mensagem de teste **antes** de criar os templates falha com log `FAILED` "Template Meta não aprovado (status NOT_CREATED)".
4. Aba Templates: 5 templates (inclui Pago) em "Não criado"; "Criar templates na Meta" muda todos para "Aprovado"; texto somente leitura. Mensagem de teste agora devolve sucesso e aparece nos logs.
5. Criar uma OS: console mostra `[WhatsApp:META_MOCK]` com `os_received_*` e 5 variáveis sem quebras de linha; `MessageLog` `SENT` com `providerMessageId` `mock-*`.
6. Pausar com motivo: 6 variáveis, a sexta com o motivo. Finalizar: `os_finished_*`.
7. Marcar como Pago: console mostra upload de `OS_<n>.pdf` e `os_paid_*` com cabeçalho de documento e 3 variáveis.
8. Desativar o template de Recebido e criar outra OS: nenhuma mensagem; log `FAILED` "Template Meta inativo".
9. Trocar provedor para Evolution na config: aba Conexão volta a mostrar QR Code; templates continuam (5). Sem servidor Evolution local, a verificação é só de tela.
10. Desligar `META_MOCK`, manter token fictício: "Testar conexão" mostra erro legível vindo da Meta (código 190) e `isConnected` fica falso.
