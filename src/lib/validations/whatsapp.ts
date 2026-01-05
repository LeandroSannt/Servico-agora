import { z } from 'zod'

export const whatsappConfigSchema = z.object({
  instanceName: z.string().min(1, 'Nome da instância é obrigatório'),
  apiKey: z.string().min(1, 'API Key é obrigatória'),
  apiUrl: z.string().min(1, 'URL da API é obrigatória'),
  companyId: z.string().min(1, 'Empresa é obrigatória'),
})

export const messageTemplateSchema = z.object({
  name: z.string().min(1, 'Nome do template é obrigatório'),
  description: z.string().optional(),
  triggerStatus: z.enum(['RECEIVED', 'IN_PROGRESS', 'PAUSED', 'FINISHED']),
  content: z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres'),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  whatsappConfigId: z.string().min(1, 'Configuração WhatsApp é obrigatória'),
})

export type WhatsAppConfigFormData = z.infer<typeof whatsappConfigSchema>
export type MessageTemplateFormData = z.infer<typeof messageTemplateSchema>

// Templates padrão para novos configs
export const defaultTemplates = {
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
}
