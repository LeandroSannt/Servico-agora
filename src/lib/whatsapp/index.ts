import prisma from '@/lib/prisma'
import type { MessageTemplate, OrderStatus, WhatsAppConfig } from '@prisma/client'
import { generateOrderPdf, type OrderPdfData } from '@/lib/pdf/generate-order-pdf'
import { defaultTemplates } from '@/lib/validations/whatsapp'
import {
  buildVariables,
  formatPhoneNumber,
  metaTemplateBodies,
  metaTemplateName,
  renderText,
  toMetaParams,
} from './message-data'
import { mapMetaStatus } from './providers/meta'
import { globalProvider, globalProviderName, providerForConfig } from './resolve-provider'
import type {
  ConnectionResult,
  MetaTemplateDefinition,
  MetaTemplateResult,
  OrderPaidMessageData,
  OrderStatusMessageData,
  TemplateRef,
  TemplateVars,
} from './types'

export type { OrderPaidMessageData, OrderStatusMessageData } from './types'
export { metaTemplateBodies, metaTemplateName } from './message-data'

const LOG = '[WhatsApp]'

// ==================== TEMPLATE ====================

type TemplateDecision = TemplateRef | { blocked: string; ref: { name: string; language: string } }

function describeTemplate(ref: TemplateRef): string {
  if (ref.kind === 'text') return ref.text
  const params = ref.params.map((p, i) => `{{${i + 1}}}=${p}`).join('; ')
  return `[META ${ref.name}/${ref.language}] ${params}`
}

function resolveTemplate(
  config: WhatsAppConfig,
  template: MessageTemplate | undefined,
  status: OrderStatus,
  vars: TemplateVars
): TemplateDecision {
  if (config.provider === 'EVOLUTION') {
    const content = template?.isActive ? template.content : defaultTemplates[status].content
    return { kind: 'text', text: renderText(content, vars) }
  }

  const name = template?.metaTemplateName || metaTemplateName(status, config.companyId)
  const language = template?.metaLanguage || 'pt_BR'
  if (!template || !template.isActive) return { blocked: 'Template Meta inativo', ref: { name, language } }
  if (template.metaStatus !== 'APPROVED') {
    return { blocked: `Template Meta não aprovado (status ${template.metaStatus})`, ref: { name, language } }
  }
  return { kind: 'meta', name, language, params: toMetaParams(status, vars) }
}

// ==================== LOG ====================

interface LogInput {
  phone: string
  message: string
  status: 'SENT' | 'FAILED'
  errorMessage?: string
  providerMessageId?: string
  orderNumber?: string
}

async function logMessage(configId: string, input: LogInput) {
  try {
    await prisma.messageLog.create({
      data: {
        phone: formatPhoneNumber(input.phone),
        message: input.message,
        status: input.status,
        errorMessage: input.errorMessage,
        providerMessageId: input.providerMessageId,
        orderNumber: input.orderNumber,
        sentAt: input.status === 'SENT' ? new Date() : null,
        whatsappConfigId: configId,
      },
    })
  } catch (error) {
    console.error(`${LOG} Erro ao salvar log:`, error)
  }
}

async function findConfig(companyId: string, status: OrderStatus) {
  try {
    return await prisma.whatsAppConfig.findUnique({
      where: { companyId },
      include: {
        templates: { where: { triggerStatus: status }, orderBy: { isActive: 'desc' }, take: 1 },
      },
    })
  } catch (error) {
    console.error(`${LOG} Erro ao buscar config:`, error)
    return null
  }
}

// Sem config da empresa: provedor global do .env
function globalTemplate(status: OrderStatus, vars: TemplateVars): TemplateRef | null {
  if (globalProviderName() === 'META') {
    return { kind: 'meta', name: metaTemplateName(status, 'global'), language: 'pt_BR', params: toMetaParams(status, vars) }
  }
  return { kind: 'text', text: renderText(defaultTemplates[status].content, vars) }
}

// ==================== API PÚBLICA ====================

// Notificação de mudança de status da OS
export async function sendOrderStatusWhatsApp(data: OrderStatusMessageData): Promise<boolean> {
  const vars = buildVariables(data)
  const config = await findConfig(data.companyId, data.status)

  if (!config) {
    const provider = globalProvider()
    if (!provider) {
      console.warn(`${LOG} Sem configuração da empresa nem global. Pulando envio.`)
      return false
    }
    const template = globalTemplate(data.status, vars)
    if (!template) return false
    const result = await provider.sendMessage({ phone: data.clientPhone, template })
    if (!result.ok) console.error(`${LOG} Falha no envio (global):`, result.error)
    return result.ok
  }

  if (!config.isConnected) {
    console.warn(`${LOG} WhatsApp da empresa não está conectado. Pulando envio.`)
    return false
  }

  const decision = resolveTemplate(config, config.templates[0], data.status, vars)
  if ('blocked' in decision) {
    console.warn(`${LOG} ${decision.blocked}`)
    await logMessage(config.id, {
      phone: data.clientPhone,
      message: `[META ${decision.ref.name}/${decision.ref.language}] (não enviado)`,
      status: 'FAILED',
      errorMessage: decision.blocked,
      orderNumber: data.orderNumber,
    })
    return false
  }

  const provider = providerForConfig(config)
  const result = await provider.sendMessage({ phone: data.clientPhone, template: decision })
  await logMessage(config.id, {
    phone: data.clientPhone,
    message: describeTemplate(decision),
    status: result.ok ? 'SENT' : 'FAILED',
    errorMessage: result.error,
    providerMessageId: result.providerMessageId,
    orderNumber: data.orderNumber,
  })
  if (!result.ok) console.error(`${LOG} Falha no envio:`, result.error)
  return result.ok
}

// Notificação de pagamento com o PDF da OS
export async function sendOrderPaidWhatsApp(data: OrderPaidMessageData): Promise<boolean> {
  const vars = buildVariables(data)
  const config = await findConfig(data.companyId, 'PAID')
  const fileName = `OS_${data.orderNumber}.pdf`

  let template: TemplateRef
  let configId: string | undefined
  let provider

  if (!config) {
    provider = globalProvider()
    if (!provider) {
      console.warn(`${LOG} Sem configuração da empresa nem global. Pulando envio do PDF.`)
      return false
    }
    const ref = globalTemplate('PAID', vars)
    if (!ref) return false
    template = ref
  } else {
    if (!config.isConnected) {
      console.warn(`${LOG} WhatsApp da empresa não está conectado. Pulando envio do PDF.`)
      return false
    }
    configId = config.id
    const decision = resolveTemplate(config, config.templates[0], 'PAID', vars)
    if ('blocked' in decision) {
      console.warn(`${LOG} ${decision.blocked}`)
      await logMessage(config.id, {
        phone: data.clientPhone,
        message: `[PDF] ${fileName} [META ${decision.ref.name}/${decision.ref.language}] (não enviado)`,
        status: 'FAILED',
        errorMessage: decision.blocked,
        orderNumber: data.orderNumber,
      })
      return false
    }
    template = decision
    provider = providerForConfig(config)
  }

  const pdfData: OrderPdfData = {
    orderNumber: data.orderNumber,
    clientName: data.clientName,
    clientPhone: data.clientPhone,
    clientEmail: data.clientEmail,
    storeName: data.storeName,
    companyName: data.companyName,
    services: data.services.map((s) => ({ name: s.name, price: s.price, quantity: s.quantity, description: s.description })),
    totalAmount: data.totalAmount,
    createdAt: data.createdAt,
    finishedAt: data.finishedAt,
    paidAt: data.paidAt,
    description: data.description,
  }

  let pdf: Buffer
  try {
    pdf = generateOrderPdf(pdfData)
  } catch (error) {
    console.error(`${LOG} Erro ao gerar PDF:`, error)
    return false
  }

  const result = await provider.sendDocument({ phone: data.clientPhone, template, pdf, fileName })
  if (configId) {
    await logMessage(configId, {
      phone: data.clientPhone,
      message: `[PDF] ${fileName} ${describeTemplate(template)}`,
      status: result.ok ? 'SENT' : 'FAILED',
      errorMessage: result.error,
      providerMessageId: result.providerMessageId,
      orderNumber: data.orderNumber,
    })
  }
  if (!result.ok) console.error(`${LOG} Falha no envio do PDF:`, result.error)
  return result.ok
}

// Verifica a conexão e grava o resultado na config da empresa (ou usa o provedor global)
export async function checkWhatsAppConnection(companyId?: string): Promise<ConnectionResult> {
  if (!companyId) {
    const provider = globalProvider()
    if (!provider) return { connected: false, error: 'WhatsApp não configurado' }
    return provider.checkConnection()
  }

  const config = await prisma.whatsAppConfig.findUnique({ where: { companyId } })
  if (!config) return { connected: false, error: 'Configuração não encontrada' }

  const result = await providerForConfig(config).checkConnection()
  await prisma.whatsAppConfig.update({
    where: { id: config.id },
    data: { isConnected: result.connected, phoneNumber: result.connected ? result.phoneNumber ?? null : null },
  })
  return result
}

// Só Evolution: cria a instância se preciso e devolve o QR Code (null se já conectado / sem QR)
export async function getWhatsAppQRCode(companyId: string): Promise<string | null> {
  const config = await prisma.whatsAppConfig.findUnique({ where: { companyId } })
  if (!config) return null
  const provider = providerForConfig(config)
  if (!provider.ensureInstanceAndGetQRCode) return null
  const qr = await provider.ensureInstanceAndGetQRCode()
  if (qr) {
    await prisma.whatsAppConfig.update({ where: { id: config.id }, data: { isConnected: false } })
  }
  return qr
}

// Só Evolution: desconecta a instância
export async function disconnectWhatsApp(companyId: string): Promise<void> {
  const config = await prisma.whatsAppConfig.findUnique({ where: { companyId } })
  if (!config) return
  const provider = providerForConfig(config)
  if (provider.disconnect) await provider.disconnect()
  await prisma.whatsAppConfig.update({
    where: { id: config.id },
    data: { isConnected: false, phoneNumber: null },
  })
}

// ==================== TEMPLATES META ====================

const APP_ID_REQUIRED = 'Informe o App ID para criar o template com documento'

function examplePdf(): Buffer {
  return generateOrderPdf({
    orderNumber: '1042',
    clientName: 'Maria Silva',
    clientPhone: '5511999990000',
    storeName: 'Loja Centro',
    companyName: 'Exemplo',
    services: [{ name: 'Troca de tela', price: 350, quantity: 1 }],
    totalAmount: 350,
    createdAt: new Date(),
    finishedAt: new Date(),
    paidAt: new Date(),
  })
}

// Cria na Meta os templates ativos ainda não criados (ou rejeitados) e grava o status
export async function syncMetaTemplates(configId: string): Promise<MetaTemplateResult[]> {
  const config = await prisma.whatsAppConfig.findUnique({
    where: { id: configId },
    include: { company: { select: { name: true } }, templates: true },
  })
  if (!config || config.provider !== 'META') throw new Error('Configuração Meta não encontrada')

  const provider = providerForConfig(config)
  if (!provider.createTemplates) throw new Error('Provedor não suporta criação de templates')

  const bodies = metaTemplateBodies(config.company.name)
  const pending = config.templates.filter(
    (t) => t.isActive && (t.metaStatus === 'NOT_CREATED' || t.metaStatus === 'REJECTED')
  )

  const defs: MetaTemplateDefinition[] = []
  const results: MetaTemplateResult[] = []

  for (const t of pending) {
    const name = t.metaTemplateName || metaTemplateName(t.triggerStatus, config.companyId)
    const body = bodies[t.triggerStatus]
    if (t.triggerStatus === 'PAID' && !config.metaAppId) {
      await prisma.messageTemplate.update({
        where: { id: t.id },
        data: { metaTemplateName: name, metaStatus: 'NOT_CREATED', metaRejectReason: APP_ID_REQUIRED },
      })
      results.push({ name, status: 'NOT_CREATED', error: APP_ID_REQUIRED })
      continue
    }
    defs.push({
      name,
      language: t.metaLanguage || 'pt_BR',
      category: 'UTILITY',
      bodyText: body.text,
      bodyExamples: body.examples,
      headerDocument: t.triggerStatus === 'PAID' ? { examplePdf: examplePdf(), fileName: 'exemplo.pdf' } : undefined,
    })
  }

  if (defs.length > 0) {
    const created = await provider.createTemplates(defs)
    for (const r of created) {
      const t = pending.find((p) => (p.metaTemplateName || metaTemplateName(p.triggerStatus, config.companyId)) === r.name)
      if (!t) continue
      await prisma.messageTemplate.update({
        where: { id: t.id },
        data: {
          metaTemplateName: r.name,
          metaStatus: r.error ? 'NOT_CREATED' : mapMetaStatus(r.status),
          metaRejectReason: r.error ?? r.rejectedReason ?? null,
        },
      })
      results.push(r)
    }
  }

  return results
}

// Consulta os status dos templates na Meta e atualiza o banco
export async function refreshMetaTemplateStatus(configId: string): Promise<void> {
  const config = await prisma.whatsAppConfig.findUnique({ where: { id: configId }, include: { templates: true } })
  if (!config || config.provider !== 'META') throw new Error('Configuração Meta não encontrada')

  const provider = providerForConfig(config)
  if (!provider.getTemplateStatuses) throw new Error('Provedor não suporta consulta de templates')

  const names = config.templates.map((t) => t.metaTemplateName || metaTemplateName(t.triggerStatus, config.companyId))
  const statuses = await provider.getTemplateStatuses(names)

  for (const t of config.templates) {
    const name = t.metaTemplateName || metaTemplateName(t.triggerStatus, config.companyId)
    const remote = statuses[name]
    // Sem App ID o PAID não existe na Meta; mantém o aviso em vez de marcar NOT_CREATED sem motivo
    if (!remote && t.triggerStatus === 'PAID' && !config.metaAppId) continue
    await prisma.messageTemplate.update({
      where: { id: t.id },
      data: {
        metaTemplateName: name,
        metaStatus: mapMetaStatus(remote?.status),
        metaRejectReason: remote
          ? remote.status === 'REJECTED' || mapMetaStatus(remote.status) === 'REJECTED'
            ? remote.rejectedReason ?? remote.status
            : null
          : null,
      },
    })
  }
}
