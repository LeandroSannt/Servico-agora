// Funções puras: sem acesso a banco, podem ser importadas pelo client.
import type { OrderStatus } from '@prisma/client'
import type { OrderPaidMessageData, OrderStatusMessageData, TemplateVars } from './types'

// Formata o número de telefone para o padrão do WhatsApp (55 + DDD + número)
export function formatPhoneNumber(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '')

  if (cleanPhone.startsWith('55') && cleanPhone.length >= 12 && cleanPhone.length <= 13) {
    return cleanPhone
  }

  let phoneWithoutCountry = cleanPhone
  if (cleanPhone.startsWith('55')) {
    phoneWithoutCountry = cleanPhone.substring(2)
  }

  if (phoneWithoutCountry.length >= 10 && phoneWithoutCountry.length <= 11) {
    return `55${phoneWithoutCountry}`
  }

  if (!cleanPhone.startsWith('55')) {
    return `55${cleanPhone}`
  }

  return cleanPhone
}

// Ordem fixa das variáveis {{1}}..{{n}} de cada template da Meta
export const META_PARAM_ORDER: Record<OrderStatus, (keyof TemplateVars)[]> = {
  RECEIVED: ['clientName', 'orderNumber', 'storeName', 'services', 'totalAmount'],
  IN_PROGRESS: ['clientName', 'orderNumber', 'storeName', 'services', 'totalAmount'],
  PAUSED: ['clientName', 'orderNumber', 'storeName', 'services', 'totalAmount', 'pausedReason'],
  FINISHED: ['clientName', 'orderNumber', 'storeName', 'services', 'totalAmount'],
  PAID: ['clientName', 'orderNumber', 'totalAmount'],
}

// A Meta não aceita quebras de linha, tabulações nem mais de 4 espaços seguidos nas variáveis
export function sanitizeParam(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 1000)
}

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function buildVariables(data: OrderStatusMessageData | OrderPaidMessageData): TemplateVars {
  const status: OrderStatus = 'status' in data ? data.status : 'PAID'
  const pausedReason = 'pausedReason' in data ? data.pausedReason : undefined
  return {
    clientName: data.clientName,
    orderNumber: data.orderNumber,
    storeName: data.storeName,
    companyName: data.companyName,
    // OS só com produtos: a Meta rejeita parâmetro vazio
    servicesMultiline:
      data.services
        .map((s) => `  • ${s.name} (${s.quantity}x) - R$ ${(s.price * s.quantity).toFixed(2)}`)
        .join('\n') || '—',
    services: data.services.map((s) => `${s.name} (${s.quantity}x) R$ ${brl(s.price * s.quantity)}`).join('; ') || '—',
    totalAmountFixed: data.totalAmount.toFixed(2),
    totalAmount: brl(data.totalAmount),
    pausedReasonBlock: pausedReason ? `\n📝 *Motivo:* ${pausedReason}\n` : '',
    pausedReason: pausedReason || 'Não informado',
    status,
  }
}

// Evolution: substitui {{variáveis}} no texto (semântica atual)
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

// Meta: lista de parâmetros na ordem do template
export function toMetaParams(status: OrderStatus, v: TemplateVars): string[] {
  return META_PARAM_ORDER[status].map((key) => sanitizeParam(String(v[key])))
}

// Nome do template na Meta: os_<status>_<6 últimos chars do companyId>
export function metaTemplateName(status: OrderStatus, companyId: string): string {
  const suffix = companyId.slice(-6).toLowerCase().replace(/[^a-z0-9]/g, '') || 'global'
  return `os_${status.toLowerCase()}_${suffix}`
}

const FOOTER = '_Mensagem automática - Não responda_'

// Textos fixos enviados à Meta para aprovação, com {{n}} no lugar das variáveis
export function metaTemplateBodies(companyName: string): Record<OrderStatus, { text: string; examples: string[] }> {
  const company = companyName.trim() || 'Serviço Agora'
  const examples = ['Maria Silva', '1042', 'Loja Centro', 'Troca de tela (1x) R$ 350,00', '350,00']
  const common = (title: string, intro: string, extra = '') =>
    `${title}

Olá, *{{1}}*!

${intro}
${extra}
📋 *Ordem de Serviço:* #{{2}}
🏪 *Loja:* {{3}}

*Serviços:* {{4}}

💰 *Total:* R$ {{5}}
`

  return {
    RECEIVED: {
      text: `${common('📥 *Serviço Recebido*', 'Recebemos sua ordem de serviço e em breve iniciaremos o atendimento.')}
_${company}_
${FOOTER}`,
      examples,
    },
    IN_PROGRESS: {
      text: `${common('🔧 *Serviço Em Andamento*', 'Seu serviço está sendo realizado pela nossa equipe.')}
_${company}_
${FOOTER}`,
      examples,
    },
    PAUSED: {
      text: `${common('⏸️ *Serviço Pausado*', 'Seu serviço está pausado.', '📝 *Motivo:* {{6}}\n')}
_${company}_
${FOOTER}`,
      examples: [...examples, 'Aguardando peça'],
    },
    FINISHED: {
      text: `${common('✅ *Serviço Finalizado*', 'Seu serviço foi concluído e está pronto para retirada!')}
🎉 Por favor, compareça à nossa loja para retirar seu produto/serviço.

_${company}_
${FOOTER}`,
      examples,
    },
    PAID: {
      text: `💚 *Pagamento Confirmado!*

Olá, *{{1}}*!

Agradecemos pela preferência! Seu pagamento foi confirmado.

📋 *OS:* #{{2}}
💰 *Total:* R$ {{3}}

Segue em anexo o comprovante da sua ordem de serviço.

_${company}_
_Obrigado pela confiança!_`,
      examples: ['Maria Silva', '1042', '350,00'],
    },
  }
}
