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

## Banco de dados (`prisma/schema.prisma`)

```prisma
enum WhatsAppProvider {
  EVOLUTION
  META
}

enum MetaTemplateStatus {
  NOT_CREATED  // ainda não enviado à Meta
  PENDING      // em análise
  APPROVED
  REJECTED
  PAUSED       // Meta pausou por qualidade
}

model WhatsAppConfig {
  // existentes...
  provider          WhatsAppProvider @default(EVOLUTION)
  // Evolution (passam a opcionais)
  instanceName      String?  @map("instance_name")
  apiKey            String?  @map("api_key")
  apiUrl            String   @default("http://localhost:8080") @map("api_url")
  // Meta
  metaPhoneNumberId String?  @map("meta_phone_number_id")
  metaWabaId        String?  @map("meta_waba_id")
  metaAccessToken   String?  @map("meta_access_token")
  metaAppId         String?  @map("meta_app_id")          // necessário só para criar o template com cabeçalho de documento
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

- `triggerStatus` de `MessageTemplate` passa a aceitar `PAID` (o enum `OrderStatus` já tem). O template `PAID` tem cabeçalho de documento e carrega o PDF.
- Aplicação do schema: `prisma db push` em dev; o `docker-entrypoint.sh` já roda `prisma db push` no deploy. `instanceName`/`apiKey` virarem opcionais não perde dados.

## Camada de provedor (`src/lib/whatsapp/`)

```
src/lib/whatsapp/
  index.ts            # API pública: sendOrderStatusWhatsApp, sendOrderPaidWhatsApp, checkWhatsAppConnection,
                      #             getWhatsAppQRCode (Evolution), syncMetaTemplates, refreshMetaTemplateStatus
  types.ts            # WhatsAppProvider interface, OrderStatusMessageData, OrderPaidMessageData, SendResult
  message-data.ts     # formatPhoneNumber, variáveis por status, sanitizeParam, textos padrão (movidos de evolution-api.ts)
  providers/
    evolution.ts      # código atual de envio texto/mídia/conexão/QR, sem regra de negócio
    meta.ts           # Cloud API: sendTemplate, uploadMedia, checkConnection, createTemplates, getTemplateStatuses
    meta-mock.ts      # mesma interface, só loga e devolve sucesso com id falso
  resolve-provider.ts # escolhe provider pela config da empresa ou pelo .env global
```

### Interface

```ts
interface SendResult { ok: boolean; providerMessageId?: string; error?: string }

interface WhatsAppProvider {
  readonly name: 'EVOLUTION' | 'META' | 'META_MOCK'
  sendStatusMessage(input: { phone: string; template: TemplateRef; data: OrderStatusMessageData }): Promise<SendResult>
  sendPaidDocument(input: { phone: string; template: TemplateRef; data: OrderPaidMessageData; pdf: Buffer; fileName: string }): Promise<SendResult>
  checkConnection(): Promise<{ connected: boolean; phoneNumber?: string | null; error?: string }>
}
// TemplateRef: para Evolution é { content: string } (texto com {{clientName}}...);
// para Meta é { name: string; language: string }.
```

Regras no `index.ts` (iguais às atuais): buscar config da empresa; sem config, usar `.env` global; se config existe e `isConnected` é falso, não envia; escolher template ativo do status; gravar `MessageLog` com `SENT`/`FAILED`, `errorMessage` e `providerMessageId`. A orquestração não sabe qual provedor está por trás.

### Resolução do provedor

- Config da empresa com `provider = META` → `MetaProvider` com as credenciais da config (`META_MOCK=true` no `.env` troca por `MetaMockProvider`).
- Config com `provider = EVOLUTION` → `EvolutionProvider` (comportamento atual).
- Sem config: `WHATSAPP_PROVIDER` no `.env` (`META` ou `EVOLUTION`, padrão `EVOLUTION`), com `META_PHONE_NUMBER_ID`, `META_WABA_ID`, `META_ACCESS_TOKEN`, `META_APP_ID` ou as `EVOLUTION_*` atuais. Para Meta sem config, os templates globais usam os nomes padrão (abaixo) em `pt_BR`.

### Variáveis por status (ordem fixa)

| Status | {{1}} | {{2}} | {{3}} | {{4}} | {{5}} | {{6}} |
|---|---|---|---|---|---|---|
| RECEIVED, IN_PROGRESS, FINISHED | clientName | orderNumber | storeName | services | totalAmount | — |
| PAUSED | clientName | orderNumber | storeName | services | totalAmount | pausedReason (ou "Não informado") |
| PAID (cabeçalho: documento PDF) | clientName | orderNumber | totalAmount | — | — | — |

- `services`: itens separados por "; " no formato `Nome (2x) R$ 40,00`.
- `totalAmount`: `1.234,56` (pt-BR, sem "R$", pois o "R$" fica no texto fixo).
- `sanitizeParam`: remove `\r\n\t`, colapsa espaços, `trim`, corta em 1000 caracteres.
- O nome da empresa entra no texto fixo do template (ele é criado por empresa), não como variável.

### Textos dos templates (criados na Meta)

Mesma estrutura dos textos padrão atuais, com `{{n}}` no lugar das variáveis e a lista de serviços numa linha. Nome na Meta: `os_<status_em_minusculo>_<6 últimos chars do companyId>` (ex.: `os_finished_a1b2c3`); apenas `[a-z0-9_]`. Categoria `UTILITY`, idioma `pt_BR`. Exemplo (FINISHED):

```
✅ *Serviço Finalizado*

Olá, *{{1}}*!

Seu serviço foi concluído e está pronto para retirada!

📋 *Ordem de Serviço:* #{{2}}
🏪 *Loja:* {{3}}

*Serviços:* {{4}}

💰 *Total:* R$ {{5}}

🎉 Por favor, compareça à nossa loja para retirar seu produto/serviço.

_<Nome da Empresa>_
_Mensagem automática - Não responda_
```

Cada template é enviado com `example.body_text` preenchido (a Meta exige exemplos). O template `PAID` tem componente `HEADER` com `format: DOCUMENT` e `example.header_handle` obtido pelo upload resumível de um PDF de exemplo gerado pelo gerador atual.

### Provedor Meta (`providers/meta.ts`)

- Base: `https://graph.facebook.com/<versão>`; versão em `META_GRAPH_API_VERSION` (padrão `v21.0`). Header `Authorization: Bearer <token>`. Timeout 30s (60s para mídia).
- `sendStatusMessage`: `POST /{phoneNumberId}/messages` com `{ messaging_product: 'whatsapp', to, type: 'template', template: { name, language: { code }, components: [{ type: 'body', parameters: [{ type: 'text', text }...] }] } }`. Sucesso quando a resposta traz `messages[0].id`.
- `sendPaidDocument`: 1) `POST /{phoneNumberId}/media` multipart (`messaging_product=whatsapp`, `type=application/pdf`, `file`) usando `FormData`/`Blob` nativos do Node 18+; 2) `POST /{phoneNumberId}/messages` com componente `header` `[{ type: 'document', document: { id, filename } }]` e `body` com as variáveis.
- `checkConnection`: `GET /{phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`. Sucesso → `connected: true`, `phoneNumber` = dígitos de `display_phone_number`. Erro 401/190 → `connected: false` com mensagem "Token inválido ou expirado".
- `createTemplates(templates)`: `POST /{wabaId}/message_templates` por template. Resposta traz `id` e `status`. Se já existir com o mesmo nome (erro código 100 subcódigo 2388024 ou mensagem contendo "already exists"), tratar como criado e consultar status.
- `getTemplateStatuses(names)`: `GET /{wabaId}/message_templates?fields=name,status,rejected_reason&limit=100`, filtrando pelos nomes.
- Upload resumível para o `header_handle` do PAID: `POST /{appId}/uploads?file_length&file_type=application/pdf` → `id`; `POST /{uploadSessionId}` com header `Authorization: OAuth <token>`, `file_offset: 0` e corpo binário → `{ h }`. Sem `metaAppId`, o PAID não é criado e o status dele fica `NOT_CREATED` com `metaRejectReason = 'Informe o App ID para criar o template com documento'`.
- Erros da Meta: extrair `error.message`, `error.code`, `error.error_subcode` e `error.error_data.details` para o `errorMessage` do log.
- Telefone: mesma `formatPhoneNumber` atual (55 + DDD + número, só dígitos).

### Mock (`providers/meta-mock.ts`)

Ativado por `META_MOCK=true`. Loga `[WhatsApp:META_MOCK]` com o payload que seria enviado (template, variáveis, nome do arquivo) e devolve `{ ok: true, providerMessageId: 'mock-<timestamp>' }`. `checkConnection` devolve `connected: true, phoneNumber: '5500000000000'`. `createTemplates` devolve status `APPROVED`. Com `META_MOCK` ligado, a tela mostra um aviso "Modo de simulação ativo".

## API

- `POST /api/whatsapp/config`: aceita `provider` e campos da Meta. Validação Zod: se `META`, exigem-se `metaPhoneNumberId`, `metaWabaId`, `metaAccessToken`; se `EVOLUTION`, `instanceName`, `apiKey`, `apiUrl`. Templates padrão criados como hoje, mais o `PAID`; para Meta, `metaTemplateName` já preenchido com o nome padrão e `metaStatus = NOT_CREATED`.
- `PUT /api/whatsapp/config`: mesmos campos. Trocar o provedor zera `isConnected` e `phoneNumber`.
- `GET /api/whatsapp/config`: **nunca devolve** `metaAccessToken` nem `apiKey` em claro; devolve `hasMetaAccessToken: boolean` e os 4 últimos caracteres (`metaAccessTokenHint`). No `PUT`, token vazio ou ausente mantém o atual.
- `POST /api/whatsapp/qrcode` (verificar conexão): usa `provider.checkConnection()`; grava `isConnected`/`phoneNumber`. `GET` (QR) e `DELETE` (desconectar) respondem `400 { error: 'Operação disponível apenas para o provedor Evolution' }` quando o provedor é Meta.
- `POST /api/whatsapp/templates/sync` (novo): cria na Meta os templates ativos ainda `NOT_CREATED`/`REJECTED` e atualiza `metaStatus`. `GET /api/whatsapp/templates/sync?companyId=` consulta os status na Meta e atualiza o banco. Ambos exigem `SUPER_ADMIN`/`COMPANY_ADMIN` e respeitam a empresa.
- `PUT /api/whatsapp/templates`: com provedor Meta, ignora `content` (texto fica na Meta) e aceita `isActive` e `metaTemplateName`.
- `POST /api/whatsapp/test`: continua chamando `sendOrderStatusWhatsApp` com status `FINISHED`.
- `GET /api/whatsapp/status` (rota global sem empresa): usa o provedor global do `.env`; `qrCode` só quando Evolution.

## Tela de administração (`src/app/(authenticated)/admin/whatsapp/page.tsx`)

- Modal de configuração ganha um seletor de provedor. Com Meta: campos Phone Number ID, WABA ID, App ID (opcional, com ajuda "necessário para o template de OS paga com PDF") e Token de acesso (campo `password`, placeholder "•••• <hint>" quando já existe). Com Evolution: comportamento atual.
- Aba "Configuração": card mostra o provedor e os IDs da Meta (token nunca aparece).
- Aba "QR Code" renomeada para "Conexão". Com Meta: botão "Testar conexão" (chama o `POST /qrcode`), mostra número verificado e status; sem QR nem Desconectar. Com Evolution: igual a hoje.
- Aba "Templates", com Meta: cada card mostra nome na Meta, idioma, badge de status (`Não criado`, `Em análise`, `Aprovado`, `Rejeitado` com motivo, `Pausado`) e o texto como **pré-visualização somente leitura** (texto padrão com `{{n}}`); botão de editar texto some; aviso "O texto é editado no Meta Business Manager; após alterar, atualize o status aqui". Botões no topo: "Criar templates na Meta" e "Atualizar status". Ativar/desativar continua.
- Banner "Modo de simulação ativo (META_MOCK)" quando a rota de config devolver `mock: true`.
- Hooks novos em `use-whatsapp.ts`: `useSyncMetaTemplates`, `useRefreshMetaTemplateStatus`; os existentes passam a enviar/receber os novos campos.

## Rotas de OS

`src/app/api/orders/route.ts` e `src/app/api/orders/[id]/route.ts` só trocam o import de `@/lib/whatsapp/evolution-api` para `@/lib/whatsapp`. Nenhuma lógica muda.

## `.env.example`

Seção WhatsApp passa a documentar `WHATSAPP_PROVIDER`, `META_GRAPH_API_VERSION`, `META_PHONE_NUMBER_ID`, `META_WABA_ID`, `META_ACCESS_TOKEN`, `META_APP_ID`, `META_MOCK`, mantendo as `EVOLUTION_*`. As variáveis `NEXT_PUBLIC_EVOLUTION_*` continuam para o fluxo Evolution.

## Verificação (manual, com `META_MOCK=true`)

1. `npx prisma db push` aplica o schema sem erro; `npx tsc --noEmit` e `npm run lint` limpos.
2. Admin > WhatsApp: criar config Meta para a empresa com IDs fictícios e token fictício. Config salva; `GET` não expõe o token.
3. Aba Conexão: "Testar conexão" marca conectado com o número do mock.
4. Aba Templates: 5 templates (inclui Pago) em "Não criado"; "Criar templates na Meta" muda todos para "Aprovado" (mock); texto em somente leitura.
5. Criar uma OS: log `[WhatsApp:META_MOCK]` com template `os_received_*` e 5 variáveis sem quebras de linha; `MessageLog` com `SENT` e `providerMessageId` `mock-*`.
6. Mudar status para Pausado com motivo: variável 6 preenchida. Finalizado: template `os_finished_*`.
7. Marcar como Pago: log mostra upload de `OS_<n>.pdf` e template `os_paid_*` com cabeçalho de documento.
8. Aba Logs lista as mensagens. Mensagem de teste devolve sucesso.
9. Trocar provedor para Evolution na config: QR Code volta a aparecer; fluxo Evolution inalterado (sem servidor Evolution local, a verificação é só de tela).
10. Desligar `META_MOCK` e, sem token real, "Testar conexão" devolve erro legível de token inválido.
