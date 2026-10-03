import { z } from 'zod'

const metaIdSchema = z.string().trim().min(1, 'Campo obrigatório')

const evolutionBranch = z.object({
  provider: z.literal('EVOLUTION'),
  instanceName: z.string().min(1, 'Nome da instância é obrigatório'),
  apiKey: z.string().min(1, 'API Key é obrigatória'),
  apiUrl: z.string().min(1, 'URL da API é obrigatória'),
  companyId: z.string().min(1, 'Empresa é obrigatória'),
})

const metaBranch = z.object({
  provider: z.literal('META'),
  metaPhoneNumberId: metaIdSchema,
  metaWabaId: metaIdSchema,
  metaAccessToken: z.string().min(1, 'Token de acesso é obrigatório'),
  metaAppId: z.string().trim().optional(),
  apiUrl: z.string().optional(),
  companyId: z.string().min(1, 'Empresa é obrigatória'),
})

// POST: cria a configuração
export const whatsappConfigSchema = z.discriminatedUnion('provider', [evolutionBranch, metaBranch])

// PUT: segredos opcionais (vazio mantém o atual) e sem companyId (vem do registro existente)
export const whatsappConfigUpdateSchema = z.discriminatedUnion('provider', [
  evolutionBranch.omit({ companyId: true }).extend({ apiKey: z.string().optional() }),
  metaBranch.omit({ companyId: true }).extend({ metaAccessToken: z.string().optional() }),
])

export const TEMPLATE_TRIGGER_STATUSES = ['RECEIVED', 'IN_PROGRESS', 'PAUSED', 'FINISHED', 'PAID'] as const
export type TemplateTriggerStatus = (typeof TEMPLATE_TRIGGER_STATUSES)[number]

export const messageTemplateSchema = z.object({
  name: z.string().min(1, 'Nome do template é obrigatório'),
  description: z.string().optional(),
  triggerStatus: z.enum(TEMPLATE_TRIGGER_STATUSES),
  // Texto com {{clientName}} etc. Obrigatório (mín. 10) só quando o provedor é Evolution; validado no handler.
  content: z.string().optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  whatsappConfigId: z.string().min(1, 'Configuração WhatsApp é obrigatória'),
  metaTemplateName: z
    .string()
    .regex(/^[a-z0-9_]{1,512}$/, 'Use apenas letras minúsculas, números e _')
    .optional(),
  metaLanguage: z.string().optional(),
})

export type WhatsAppConfigFormData = z.infer<typeof whatsappConfigSchema>
export type WhatsAppConfigUpdateData = z.infer<typeof whatsappConfigUpdateSchema>
export type MessageTemplateFormData = z.infer<typeof messageTemplateSchema>

// Templates padrão (única fonte dos textos padrão; usados pela Evolution e como base dos templates da Meta)
export const defaultTemplates: Record<TemplateTriggerStatus, { name: string; description: string; content: string }> = {
  RECEIVED: {
    name: 'Serviço Recebido',
    description: 'Enviado quando o serviço é recebido',
    content: `📥 *Serviço Recebido*

Olá, *{{clientName}}*!

Recebemos sua ordem de serviço e em breve iniciaremos o atendimento.

📋 *Ordem de Serviço:* #{{orderNumber}}
🏪 *Loja:* {{storeName}}

*Serviços:*
{{services}}

💰 *Total:* R$ {{totalAmount}}

_{{companyName}}_
_Mensagem automática - Não responda_`,
  },
  IN_PROGRESS: {
    name: 'Em Andamento',
    description: 'Enviado quando o serviço está em andamento',
    content: `🔧 *Serviço Em Andamento*

Olá, *{{clientName}}*!

Seu serviço está sendo realizado pela nossa equipe.

📋 *Ordem de Serviço:* #{{orderNumber}}
🏪 *Loja:* {{storeName}}

*Serviços:*
{{services}}

💰 *Total:* R$ {{totalAmount}}

_{{companyName}}_
_Mensagem automática - Não responda_`,
  },
  PAUSED: {
    name: 'Pausado',
    description: 'Enviado quando o serviço está pausado',
    content: `⏸️ *Serviço Pausado*

Olá, *{{clientName}}*!

Seu serviço está pausado.
{{pausedReason}}
📋 *Ordem de Serviço:* #{{orderNumber}}
🏪 *Loja:* {{storeName}}

*Serviços:*
{{services}}

💰 *Total:* R$ {{totalAmount}}

_{{companyName}}_
_Mensagem automática - Não responda_`,
  },
  FINISHED: {
    name: 'Serviço Finalizado',
    description: 'Enviado quando o serviço é finalizado',
    content: `✅ *Serviço Finalizado*

Olá, *{{clientName}}*!

Seu serviço foi concluído e está pronto para retirada!

📋 *Ordem de Serviço:* #{{orderNumber}}
🏪 *Loja:* {{storeName}}

*Serviços:*
{{services}}

💰 *Total:* R$ {{totalAmount}}

🎉 Por favor, compareça à nossa loja para retirar seu produto/serviço.

_{{companyName}}_
_Mensagem automática - Não responda_`,
  },
  PAID: {
    name: 'Pagamento Confirmado',
    description: 'Enviado com o PDF da OS quando o pagamento é confirmado',
    content: `💚 *Pagamento Confirmado!*

Olá, *{{clientName}}*!

Agradecemos pela preferência! Seu pagamento foi confirmado.

📋 *OS:* #{{orderNumber}}
💰 *Total:* R$ {{totalAmount}}

Segue em anexo o comprovante da sua ordem de serviço.

_{{companyName}}_
_Obrigado pela confiança!_`,
  },
}
