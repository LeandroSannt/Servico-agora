# WhatsApp: provedor Meta — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar as notificações de OS pela WhatsApp Cloud API da Meta (templates aprovados com variáveis), mantendo a Evolution como provedor alternativo e o mesmo funcionamento para o usuário.

**Architecture:** `src/lib/whatsapp/index.ts` concentra as regras (config, template, variáveis, log) e delega a um `MessagingProvider` (`providers/evolution.ts`, `providers/meta.ts`, `providers/meta-mock.ts`) escolhido por `resolve-provider.ts`. Rotas de OS só trocam o import. Rotas de WhatsApp e a tela de admin ganham os campos da Meta, a sincronização de templates e o teste de conexão.

**Tech Stack:** Next.js 14, Prisma 7, zod 4, axios 1.13 (FormData/Blob nativos do Node 22), TanStack Query 5.

**Spec:** `docs/superpowers/specs/2026-10-03-whatsapp-meta-provider-design.md` — textos literais dos templates, payloads da Meta e regras estão lá; este plano referencia as seções em vez de repetir.

**Testes:** sem runner. Cada task termina com `npx tsc --noEmit`; lint na Task 7; roteiro manual na Task 8 com `META_MOCK=true`.

---

### Task 1: Schema, validações e textos padrão

**Files:**
- Modify: `prisma/schema.prisma` (WhatsAppConfig, MessageTemplate, MessageLog, novos enums)
- Modify: `src/lib/validations/whatsapp.ts`
- Modify: `.env`, `.env.example`

- [ ] **Step 1: Schema** — aplicar o bloco "Banco de dados" do spec. Enums `WhatsAppProviderType` e `MetaTemplateStatus`; `instanceName`/`apiKey` opcionais; campos `provider`, `meta*`; `MessageTemplate.meta*`; `MessageLog.providerMessageId`.
- [ ] **Step 2: `npx prisma db push --config prisma/prisma.config.ts && npx prisma generate --config prisma/prisma.config.ts`** — Expected: "Your database is now in sync".
- [ ] **Step 3: Validações** — `src/lib/validations/whatsapp.ts`:

```ts
import { z } from 'zod'

const metaIdSchema = z.string().trim().min(1)

const evolutionBranch = z.object({
  provider: z.literal('EVOLUTION'),
  instanceName: z.string().min(1, 'Nome da instância é obrigatório'),
  apiKey: z.string().min(1, 'API Key é obrigatória'),
  apiUrl: z.string().min(1, 'URL da API é obrigatória'),
  companyId: z.string().min(1, 'Empresa é obrigatória'),
})

const metaBranch = z.object({
  provider: z.literal('META'),
  metaPhoneNumberId: metaIdSchema.describe('Phone Number ID'),
  metaWabaId: metaIdSchema.describe('WABA ID'),
  metaAccessToken: z.string().min(1, 'Token de acesso é obrigatório'),
  metaAppId: z.string().trim().optional(),
  apiUrl: z.string().optional(),
  companyId: z.string().min(1, 'Empresa é obrigatória'),
})

export const whatsappConfigSchema = z.discriminatedUnion('provider', [evolutionBranch, metaBranch])

// PUT: segredos opcionais (vazio mantém o atual) e sem companyId
export const whatsappConfigUpdateSchema = z.discriminatedUnion('provider', [
  evolutionBranch.omit({ companyId: true }).extend({ apiKey: z.string().optional() }),
  metaBranch.omit({ companyId: true }).extend({ metaAccessToken: z.string().optional() }),
])

export const messageTemplateSchema = z.object({
  name: z.string().min(1, 'Nome do template é obrigatório'),
  description: z.string().optional(),
  triggerStatus: z.enum(['RECEIVED', 'IN_PROGRESS', 'PAUSED', 'FINISHED', 'PAID']),
  content: z.string().optional(),            // handler exige min 10 quando o config é Evolution
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  whatsappConfigId: z.string().min(1, 'Configuração WhatsApp é obrigatória'),
  metaTemplateName: z.string().regex(/^[a-z0-9_]{1,512}$/, 'Use apenas letras minúsculas, números e _').optional(),
  metaLanguage: z.string().optional(),
})

export type WhatsAppConfigFormData = z.infer<typeof whatsappConfigSchema>
export type WhatsAppConfigUpdateData = z.infer<typeof whatsappConfigUpdateSchema>
export type MessageTemplateFormData = z.infer<typeof messageTemplateSchema>
```

`defaultTemplates`: manter os 4 atuais e adicionar `PAID` com o texto da seção "Validações" do spec. Tipar como `Record<'RECEIVED'|'IN_PROGRESS'|'PAUSED'|'FINISHED'|'PAID', { name; description; content }>`.

- [ ] **Step 4: `.env` e `.env.example`** — adicionar `WHATSAPP_PROVIDER=EVOLUTION`, `META_GRAPH_API_VERSION=v21.0`, `META_PHONE_NUMBER_ID=`, `META_WABA_ID=`, `META_ACCESS_TOKEN=`, `META_APP_ID=`, `META_MOCK=false` (no `.env` local: `META_MOCK=true`); no `.env.example` também `NEXT_PUBLIC_EVOLUTION_API_URL` e `NEXT_PUBLIC_EVOLUTION_API_KEY`.
- [ ] **Step 5: `npx tsc --noEmit`** — vai falhar em `config/route.ts` (schema mudou) e no uso de `instanceName` nulo; é esperado até a Task 4. Anotar os erros e seguir.
- [ ] **Step 6: Commit** `feat(whatsapp): schema e validações para provedor Meta`.

---

### Task 2: Camada de provedor — tipos, dados e Evolution

**Files:**
- Create: `src/lib/whatsapp/types.ts`, `src/lib/whatsapp/message-data.ts`, `src/lib/whatsapp/providers/evolution.ts`
- (ainda não apagar `evolution-api.ts`; some na Task 3)

- [ ] **Step 1: `types.ts`** — seção "Tipos" do spec, mais:

```ts
export interface MetaTemplateDefinition {
  name: string; language: string; category: 'UTILITY'
  bodyText: string; bodyExamples: string[]; headerDocument?: { examplePdf: Buffer; fileName: string }
}
export interface MetaTemplateResult { name: string; status: string; rejectedReason?: string; error?: string }
export type ConnectionResult = { connected: boolean; phoneNumber?: string | null; error?: string }
```

Mover para cá `OrderStatusMessageData` e `OrderPaidMessageData` (iguais aos de `evolution-api.ts`).

- [ ] **Step 2: `message-data.ts`** — `formatPhoneNumber` (copiar), `buildVariables`, `renderText`, `toMetaParams`, `sanitizeParam`, `metaTemplateName`, `metaTemplateBodies`, `META_PARAM_ORDER`:

```ts
export const META_PARAM_ORDER: Record<OrderStatus, (keyof TemplateVars)[]> = {
  RECEIVED: ['clientName', 'orderNumber', 'storeName', 'services', 'totalAmount'],
  IN_PROGRESS: ['clientName', 'orderNumber', 'storeName', 'services', 'totalAmount'],
  PAUSED: ['clientName', 'orderNumber', 'storeName', 'services', 'totalAmount', 'pausedReason'],
  FINISHED: ['clientName', 'orderNumber', 'storeName', 'services', 'totalAmount'],
  PAID: ['clientName', 'orderNumber', 'totalAmount'],
}

export function sanitizeParam(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 1000)
}

const brl = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function buildVariables(data: OrderStatusMessageData | OrderPaidMessageData): TemplateVars {
  const status = 'status' in data ? data.status : 'PAID'
  const pausedReason = 'pausedReason' in data ? data.pausedReason : undefined
  return {
    clientName: data.clientName,
    orderNumber: data.orderNumber,
    storeName: data.storeName,
    companyName: data.companyName,
    servicesMultiline: data.services.map((s) => `  • ${s.name} (${s.quantity}x) - R$ ${(s.price * s.quantity).toFixed(2)}`).join('\n'),
    services: data.services.map((s) => `${s.name} (${s.quantity}x) R$ ${brl(s.price * s.quantity)}`).join('; '),
    totalAmountFixed: data.totalAmount.toFixed(2),
    totalAmount: brl(data.totalAmount),
    pausedReasonBlock: pausedReason ? `\n📝 *Motivo:* ${pausedReason}\n` : '',
    pausedReason: pausedReason || 'Não informado',
    status,
  }
}

// Evolution: semântica atual de replaceTemplateVariables
export function renderText(content: string, v: TemplateVars): string {
  return content
    .replace(/\{\{clientName\}\}/g, v.clientName)
    .replace(/\{\{orderNumber\}\}/g, v.orderNumber)
    .replace(/\{\{storeName\}\}/g, v.storeName)
    .replace(/\{\{companyName\}\}/g, v.companyName)
    .replace(/\{\{services\}\}/g, v.servicesMultiline)
    .replace(/\{\{totalAmount\}\}/g, v.totalAmountFixed)
    .replace(/\{\{status\}\}/g, v.status)
    .replace(/\{\{pausedReason\}\}/g, v.pausedReasonBlock)
}

export function toMetaParams(status: OrderStatus, v: TemplateVars): string[] {
  return META_PARAM_ORDER[status].map((key) => sanitizeParam(String(v[key])))
}

export const metaTemplateName = (status: OrderStatus, companyId: string) =>
  `os_${status.toLowerCase()}_${companyId.slice(-6).toLowerCase().replace(/[^a-z0-9]/g, '')}`

export function metaTemplateBodies(companyName: string): Record<OrderStatus, { text: string; examples: string[] }>
// textos literais da seção "Textos dos templates Meta" do spec; `<Empresa>` = companyName
```

- [ ] **Step 3: `providers/evolution.ts`** — classe `EvolutionProvider implements MessagingProvider` com `constructor({ apiUrl, apiKey, instanceName })`. Métodos: `sendMessage` (só `kind: 'text'`; `POST /message/sendText`), `sendDocument` (`POST /message/sendMedia` com base64 do `pdf`; `caption` = `template.text`), `checkConnection` (`GET /instance/connectionState`, `ownerJid` → telefone), `ensureInstanceAndGetQRCode` (fluxo atual do GET de `qrcode/route.ts`: estado → create com `integration: 'WHATSAPP-BAILEYS'` → connect → retry em 404 → se sem QR e estado `open`, devolve `null` e o chamador reconsulta a conexão), `disconnect` (`DELETE /instance/logout`). Sem acesso ao Prisma; devolve `SendResult` com `error` montado a partir de `axios.isAxiosError`. Se `template.kind !== 'text'`, devolve `{ ok: false, error: 'Evolution só envia texto' }`.
- [ ] **Step 4: `npx tsc --noEmit`** — os novos arquivos não podem introduzir erros (os da Task 1 continuam).
- [ ] **Step 5: Commit** `feat(whatsapp): tipos, dados de mensagem e provedor Evolution`.

---

### Task 3: Provedor Meta, mock, resolução e orquestração

**Files:**
- Create: `src/lib/whatsapp/providers/meta.ts`, `src/lib/whatsapp/providers/meta-mock.ts`, `src/lib/whatsapp/resolve-provider.ts`, `src/lib/whatsapp/index.ts`
- Delete: `src/lib/whatsapp/evolution-api.ts`
- Modify: `src/app/api/orders/route.ts:6`, `src/app/api/orders/[id]/route.ts:5` (import → `@/lib/whatsapp`)

- [ ] **Step 1: `providers/meta.ts`** — classe `MetaProvider` com `constructor({ phoneNumberId, wabaId, accessToken, appId?, apiVersion })`. Cliente axios com `baseURL = https://graph.facebook.com/${apiVersion}` e `Authorization: Bearer`. Implementar conforme "Provedor Meta" do spec:

```ts
private extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const e = err.response?.data?.error
    if (e) return `${e.message}${e.error_data?.details ? ` - ${e.error_data.details}` : ''} [${e.code}/${e.error_subcode ?? '-'}]`
    return err.message
  }
  return err instanceof Error ? err.message : 'Erro desconhecido'
}

async sendMessage({ phone, template }) {
  if (template.kind !== 'meta') return { ok: false, error: 'Meta exige template aprovado' }
  const body = {
    messaging_product: 'whatsapp', to: formatPhoneNumber(phone), type: 'template',
    template: { name: template.name, language: { code: template.language },
      components: [{ type: 'body', parameters: template.params.map((text) => ({ type: 'text', text })) }] },
  }
  // POST /{phoneNumberId}/messages → messages[0].id
}

async sendDocument({ phone, template, pdf, fileName }) {
  // 1) FormData: messaging_product=whatsapp, type=application/pdf, file=new Blob([pdf], { type: 'application/pdf' }) com fileName
  //    POST /{phoneNumberId}/media (timeout 60000) → data.id
  // 2) POST /{phoneNumberId}/messages com components [header document {id, filename}, body params]
}

async checkConnection() {
  // GET /{phoneNumberId}?fields=display_phone_number,verified_name,quality_rating
  // code 190 → 'Token inválido ou expirado'
}

async createTemplates(defs) { /* POST /{wabaId}/message_templates por def; PAID com HEADER DOCUMENT + header_handle via uploadExampleHandle(); 'already exists' → consultar status */ }
async getTemplateStatuses(names) { /* GET /{wabaId}/message_templates?fields=name,status,rejected_reason&limit=100, seguir paging.next */ }
private async uploadExampleHandle(pdf: Buffer, fileName: string): Promise<string> {
  // POST /{appId}/uploads?file_name&file_length&file_type=application/pdf (Authorization: OAuth) → id
  // POST /{id} (Authorization: OAuth, file_offset: 0, Content-Type: application/octet-stream, body = pdf) → h
}
```

Exportar `mapMetaStatus(status: string): MetaTemplateStatus` (mapeamento do spec).

- [ ] **Step 2: `providers/meta-mock.ts`** — `MetaMockProvider`: `console.log('[WhatsApp:META_MOCK]', {...})` e retornos do spec.
- [ ] **Step 3: `resolve-provider.ts`**:

```ts
export function providerForConfig(config: WhatsAppConfig): MessagingProvider
export function globalProvider(): MessagingProvider | null   // null se o .env não tem credenciais do provedor escolhido
export const isMetaMock = () => process.env.META_MOCK === 'true'
```

- [ ] **Step 4: `index.ts`** — regras da seção "Regras em index.ts" do spec. Esqueleto:

```ts
export async function sendOrderStatusWhatsApp(data: OrderStatusMessageData): Promise<boolean> {
  const config = await prisma.whatsAppConfig.findUnique({ where: { companyId: data.companyId }, include: { templates: { where: { triggerStatus: data.status }, orderBy: { isActive: 'desc' }, take: 1 } } })
  const vars = buildVariables(data)
  if (!config) return sendGlobal(data.clientPhone, data.status, vars, data.orderNumber)
  if (!config.isConnected) { console.warn('[WhatsApp] Não conectado. Pulando.'); return false }
  const provider = providerForConfig(config)
  const ref = resolveTemplateRef(config, config.templates[0], data.status, vars)   // TemplateRef | { blocked: string }
  if ('blocked' in ref) { await logMessage(config.id, { phone, message: blockedMessage(...), status: 'FAILED', errorMessage: ref.blocked, orderNumber }); return false }
  const result = await provider.sendMessage({ phone: data.clientPhone, template: ref })
  await logMessage(config.id, { phone, message: describeTemplate(ref), status: result.ok ? 'SENT' : 'FAILED', errorMessage: result.error, providerMessageId: result.providerMessageId, orderNumber })
  return result.ok
}
export async function sendOrderPaidWhatsApp(data: OrderPaidMessageData): Promise<boolean>  // idem, com generateOrderPdf + provider.sendDocument
export async function checkWhatsAppConnection(companyId?: string): Promise<ConnectionResult>  // grava isConnected/phoneNumber
export async function getWhatsAppQRCode(companyId: string): Promise<string | null>           // 'EVOLUTION' only
export async function disconnectWhatsApp(companyId: string): Promise<void>
export async function syncMetaTemplates(configId: string): Promise<MetaTemplateResult[]>     // cria NOT_CREATED/REJECTED ativos, grava metaStatus
export async function refreshMetaTemplateStatus(configId: string): Promise<void>
export type { OrderStatusMessageData, OrderPaidMessageData } from './types'
```

`resolveTemplateRef`: Evolution → `{ kind: 'text', text: renderText(template?.isActive ? template.content : defaultTemplates[status].content, vars) }`; Meta → exige `template?.isActive` e `metaStatus === 'APPROVED'`, senão `blocked` com as mensagens do spec. `describeTemplate` gera o `message` do log (formatos do spec). PAID: `fileName = OS_${orderNumber}.pdf`, Evolution `caption` = texto renderizado do template PAID.

- [ ] **Step 5: Apagar `evolution-api.ts`; trocar imports nas rotas de OS.** `grep -rn "evolution-api" src` deve retornar vazio.
- [ ] **Step 6: `npx tsc --noEmit`** — restam só os erros das rotas de WhatsApp (Task 4).
- [ ] **Step 7: Commit** `feat(whatsapp): provedor Meta, mock e orquestração independente de provedor`.

---

### Task 4: Rotas de WhatsApp

**Files:**
- Modify: `src/app/api/whatsapp/config/route.ts`, `qrcode/route.ts`, `status/route.ts`, `templates/route.ts`, `test/route.ts`
- Create: `src/app/api/whatsapp/templates/sync/route.ts`

- [ ] **Step 1: `config/route.ts`** — `sanitizeConfig(config)`; GET devolve `{ ...sanitizeConfig(config), mock: isMetaMock() }` ou `null`; POST com `whatsappConfigSchema`, cria os 5 templates (`metaTemplateName` para Meta), e com Meta chama `checkWhatsAppConnection(companyId)`; PUT com `whatsappConfigUpdateSchema` + regras de segredo (400 "Token de acesso é obrigatório"/"API Key é obrigatória"), zera conexão ao trocar provedor, garante 5 templates e `metaTemplateName`, chama `checkConnection` quando Meta. Erros Zod: `error instanceof z.ZodError` → 400 com `issues`.
- [ ] **Step 2: `qrcode/route.ts`** — GET: guardas atuais; se `config.provider !== 'EVOLUTION'` → 400 "Operação disponível apenas para o provedor Evolution"; senão `getWhatsAppQRCode(companyId)`; se `null`, reconsulta `checkWhatsAppConnection` e devolve `connected` ou 500 "Não foi possível gerar o QR Code". POST: guardas + `checkWhatsAppConnection(companyId)` → 200 `{ connected, state: connected ? 'open' : 'disconnected', phoneNumber, error }`. DELETE: guardas + 400 para Meta; `disconnectWhatsApp`.
- [ ] **Step 3: `status/route.ts`** — `const provider = globalProvider()`; sem provedor → `{ connected: false, qrCode: null, mock, message: 'WhatsApp não configurado' }`; senão `checkConnection()` e `qrCode` só via `ensureInstanceAndGetQRCode?.()`.
- [ ] **Step 4: `templates/route.ts`** — POST/PUT: carregar config; se Evolution e `content` com menos de 10 chars → 400 "Conteúdo deve ter pelo menos 10 caracteres"; se Meta, ignorar `content` e aceitar `metaTemplateName`/`metaLanguage` (ao mudar o nome, `metaStatus = NOT_CREATED`).
- [ ] **Step 5: `templates/sync/route.ts`** — POST `{ companyId }` → guardas (400/403/404), 400 se não Meta, `syncMetaTemplates(config.id)` → `{ results }`. GET `?companyId=` → `refreshMetaTemplateStatus(config.id)` → templates atualizados.
- [ ] **Step 6: `test/route.ts`** — passar `companyId: body.companyId` (string vazia continua caindo no global).
- [ ] **Step 7: `npx tsc --noEmit`** — Expected: sem erros.
- [ ] **Step 8: Commit** `feat(whatsapp): rotas com provedor Meta, sanitização de segredos e sync de templates`.

---

### Task 5: Hooks

**Files:**
- Modify: `src/hooks/api/use-whatsapp.ts`

- [ ] **Step 1:** Tipos conforme seção "Hooks" do spec (exportar `WhatsAppConfig`, `MessageTemplate`, `MetaTemplateStatus`-like union). `useCreateWhatsAppConfig`/`useUpdateWhatsAppConfig` recebem `WhatsAppConfigFormData` / `WhatsAppConfigUpdateData & { id: string }` de `@/lib/validations`. `useUpdateMessageTemplate` aceita `metaTemplateName`, `metaLanguage`. Novos `useSyncMetaTemplates()` e `useRefreshMetaTemplateStatus()` (invalidam `whatsapp-config`). `useTestWhatsAppMessage` envia `{ phone, companyId }`. `ConnectionStatusResponse.error?`.
- [ ] **Step 2: `npx tsc --noEmit`** — vai apontar a página (Task 6). Commit `feat(whatsapp): hooks para provedor Meta`.

---

### Task 6: Tela de administração

**Files:**
- Modify: `src/app/(authenticated)/admin/whatsapp/page.tsx`

- [ ] **Step 1: Estado do modal** — `const [form, setForm] = useState<{ provider: 'EVOLUTION' | 'META'; metaPhoneNumberId: string; metaWabaId: string; metaAppId: string; metaAccessToken: string }>` inicializado da `config` ao abrir. `handleSaveConfig`: monta o body por provedor (Evolution como hoje; Meta com os campos, token só se preenchido) e chama create/update.
- [ ] **Step 2: Modal** — `Select` "Provedor" + campos Meta (`Input` `type="password"` para o token, placeholder `•••• ${config?.metaAccessTokenHint ?? ''}` quando `hasMetaAccessToken`) ou o resumo Evolution atual.
- [ ] **Step 3: Aba Configuração** — card com provedor e IDs da Meta ("Token: configurado (…abcd)").
- [ ] **Step 4: Aba Conexão** — `isMeta = config?.provider === 'META'`. Meta: botão "Testar conexão" (`checkConnection.mutateAsync`), número e `error` em vermelho; sem QR/Desconectar. Caixa "Mensagem de teste" (campo telefone + botão, `useTestWhatsAppMessage` com `companyId`) para ambos os provedores, exibindo `message`/`error` do retorno.
- [ ] **Step 5: Aba Templates** — Meta: botões "Criar templates na Meta" e "Atualizar status"; cards com `metaTemplateName`, idioma, badge de `metaStatus` (cores: NOT_CREATED cinza, PENDING amarelo, APPROVED verde, REJECTED vermelho + `metaRejectReason`, PAUSED laranja) e pré-visualização somente leitura de `metaTemplateBodies(selectedCompany.name)[triggerStatus].text` (função pura, importável no client); sem botão editar; aviso do spec. Evolution: como hoje.
- [ ] **Step 6: Banner mock** — `config?.mock` ou `useWhatsAppStatus().data?.mock` → faixa amarela "Modo de simulação ativo (META_MOCK): nenhuma mensagem é enviada à Meta".
- [ ] **Step 7: `npx tsc --noEmit`** — Expected: sem erros. Commit `feat(whatsapp): tela de administração com provedor Meta`.

---

### Task 7: Lint e limpeza

- [ ] `npm run lint` sem erros; remover imports não usados (`QrCode`, etc. se sobrarem).
- [ ] `grep -rn "evolution-api\|NEXT_PUBLIC_EVOLUTION" src` — só a página deve referenciar `NEXT_PUBLIC_EVOLUTION_*` (fluxo Evolution).
- [ ] Commit `chore(whatsapp): lint`.

---

### Task 8: Verificação manual

Seguir os 10 passos da seção "Verificação" do spec, no browser integrado, com `META_MOCK=true`, logado como admin. Registrar screenshots da aba Templates (status Aprovado), da aba Conexão e do console com `[WhatsApp:META_MOCK]` nas mudanças de status e no PDF.
