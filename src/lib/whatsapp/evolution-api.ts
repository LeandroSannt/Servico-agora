import axios from 'axios'
import prisma from '@/lib/prisma'
import type { OrderStatus } from '@prisma/client'
import { generateOrderPdfBase64, type OrderPdfData } from '@/lib/pdf/generate-order-pdf'

// Configurações globais (fallback)
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'servico-agora'

// Normaliza a URL removendo barras finais para evitar URLs duplicadas (ex: //instance)
function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

interface SendMessageParams {
  phone: string
  message: string
  configId?: string
  orderNumber?: string
}

interface SendDocumentParams {
  phone: string
  documentBase64: string
  fileName: string
  caption?: string
  configId?: string
  orderNumber?: string
}

export interface OrderPaidMessageData {
  clientName: string
  clientPhone: string
  clientEmail?: string | null
  orderNumber: string
  storeName: string
  companyName: string
  companyId: string
  services: { name: string; price: number; quantity: number; description?: string | null }[]
  totalAmount: number
  description?: string | null
  createdAt: Date | string
  finishedAt?: Date | string | null
  paidAt?: Date | string | null
}

export interface OrderStatusMessageData {
  clientName: string
  clientPhone: string
  orderNumber: string
  storeName: string
  companyName: string
  companyId: string
  status: OrderStatus
  pausedReason?: string // Motivo quando status = PAUSED
  services: { name: string; price: number; quantity: number }[]
  totalAmount: number
}

// Formata o número de telefone para o padrão do WhatsApp (55 + DDD + número)
function formatPhoneNumber(phone: string): string {
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

// Substitui variáveis no template
function replaceTemplateVariables(
  template: string,
  data: OrderStatusMessageData
): string {
  const servicesList = data.services
    .map((s) => `  • ${s.name} (${s.quantity}x) - R$ ${(s.price * s.quantity).toFixed(2)}`)
    .join('\n')

  // Formatar motivo com prefixo se existir
  const pausedReasonFormatted = data.pausedReason
    ? `\n📝 *Motivo:* ${data.pausedReason}\n`
    : ''

  return template
    .replace(/\{\{clientName\}\}/g, data.clientName)
    .replace(/\{\{orderNumber\}\}/g, data.orderNumber)
    .replace(/\{\{storeName\}\}/g, data.storeName)
    .replace(/\{\{companyName\}\}/g, data.companyName)
    .replace(/\{\{services\}\}/g, servicesList)
    .replace(/\{\{totalAmount\}\}/g, data.totalAmount.toFixed(2))
    .replace(/\{\{status\}\}/g, data.status)
    .replace(/\{\{pausedReason\}\}/g, pausedReasonFormatted)
}

// Templates padrão
const defaultTemplates: Record<string, { emoji: string; title: string; description: string }> = {
  RECEIVED: {
    emoji: '📥',
    title: 'Serviço Recebido',
    description: 'Recebemos sua ordem de serviço e em breve iniciaremos o atendimento.',
  },
  IN_PROGRESS: {
    emoji: '🔧',
    title: 'Em Andamento',
    description: 'Seu serviço está sendo realizado pela nossa equipe.',
  },
  PAUSED: {
    emoji: '⏸️',
    title: 'Pausado',
    description: 'Seu serviço está pausado.',
  },
  FINISHED: {
    emoji: '✅',
    title: 'Serviço Finalizado',
    description: 'Seu serviço foi concluído e está pronto para retirada!',
  },
}

// Gera mensagem usando template padrão
function generateDefaultMessage(data: OrderStatusMessageData): string {
  const statusInfo = defaultTemplates[data.status]

  const servicesList = data.services
    .map((s) => `  • ${s.name} (${s.quantity}x) - R$ ${(s.price * s.quantity).toFixed(2)}`)
    .join('\n')

  // Adicionar motivo se status for PAUSED e tiver motivo
  const pausedReasonText = data.status === 'PAUSED' && data.pausedReason
    ? `\n📝 *Motivo:* ${data.pausedReason}\n`
    : ''

  return `${statusInfo.emoji} *${statusInfo.title}*

Olá, *${data.clientName}*!

${statusInfo.description}
${pausedReasonText}
📋 *Ordem de Serviço:* #${data.orderNumber}
🏪 *Loja:* ${data.storeName}

*Serviços:*
${servicesList}

💰 *Total:* R$ ${data.totalAmount.toFixed(2)}

${data.status === 'FINISHED' ? '🎉 Por favor, compareça à nossa loja para retirar seu produto/serviço.\n' : ''}_${data.companyName}_
_Mensagem automática - Não responda_`
}

// Envia mensagem via Evolution API
async function sendWhatsAppMessage({
  phone,
  message,
  configId,
  orderNumber,
}: SendMessageParams): Promise<boolean> {
  let apiUrl = EVOLUTION_API_URL
  let apiKey = EVOLUTION_API_KEY
  let instanceName = EVOLUTION_INSTANCE

  // Buscar configuração personalizada
  if (configId) {
    try {
      const config = await prisma.whatsAppConfig.findUnique({
        where: { id: configId },
      })
      if (config) {
        apiUrl = config.apiUrl
        apiKey = config.apiKey
        instanceName = config.instanceName
      }
    } catch (e) {
      console.error('[WhatsApp] Erro ao buscar config:', e)
    }
  }

  if (!apiKey) {
    console.warn('[WhatsApp] API Key não configurada')
    return false
  }

  const formattedPhone = formatPhoneNumber(phone)

  // Normalizar URL para evitar barras duplas
  apiUrl = normalizeUrl(apiUrl)

  console.log('[WhatsApp] ========== ENVIANDO MENSAGEM ==========')
  console.log('[WhatsApp] Telefone original:', phone)
  console.log('[WhatsApp] Telefone formatado:', formattedPhone)
  console.log('[WhatsApp] URL:', `${apiUrl}/message/sendText/${instanceName}`)

  try {
    const response = await axios.post(
      `${apiUrl}/message/sendText/${instanceName}`,
      {
        number: formattedPhone,
        text: message,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
        timeout: 30000,
      }
    )

    console.log('[WhatsApp] Resposta status:', response.status)

    // Registrar log
    if (configId) {
      try {
        await prisma.messageLog.create({
          data: {
            phone: formattedPhone,
            message,
            status: response.status === 200 || response.status === 201 ? 'SENT' : 'FAILED',
            orderNumber,
            sentAt: new Date(),
            whatsappConfigId: configId,
          },
        })
      } catch (logError) {
        console.error('[WhatsApp] Erro ao salvar log:', logError)
      }
    }

    if (response.status === 200 || response.status === 201) {
      console.log(`[WhatsApp] ✅ Mensagem enviada com sucesso para ${formattedPhone}`)
      return true
    }

    console.error('[WhatsApp] ❌ Resposta inesperada:', response.status)
    return false
  } catch (error) {
    // Registrar erro no log
    if (configId) {
      try {
        await prisma.messageLog.create({
          data: {
            phone: formattedPhone,
            message,
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
            orderNumber,
            whatsappConfigId: configId,
          },
        })
      } catch (logError) {
        console.error('[WhatsApp] Erro ao salvar log de erro:', logError)
      }
    }

    if (axios.isAxiosError(error)) {
      console.error('[WhatsApp] ❌ Erro ao enviar mensagem:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      })
    } else {
      console.error('[WhatsApp] ❌ Erro ao enviar mensagem:', error)
    }
    return false
  }
}

// Envia notificação de atualização de status da OS via WhatsApp
export async function sendOrderStatusWhatsApp(data: OrderStatusMessageData): Promise<boolean> {
  console.log('[WhatsApp] Tentando enviar mensagem para:', data.clientPhone)
  console.log('[WhatsApp] Company ID:', data.companyId)
  console.log('[WhatsApp] Status:', data.status)
  console.log('[WhatsApp] PausedReason recebido:', data.pausedReason)

  // Buscar configuração WhatsApp da company
  let config = null
  try {
    config = await prisma.whatsAppConfig.findUnique({
      where: { companyId: data.companyId },
      include: {
        templates: {
          where: {
            triggerStatus: data.status,
            isActive: true,
          },
          take: 1,
        },
      },
    })
  } catch (e) {
    console.log('[WhatsApp] Erro ao buscar config (tabela pode não existir ainda):', e)
  }

  // Se não há configuração para esta company, usar configuração global
  if (!config) {
    console.log('[WhatsApp] Usando configuração global (sem config da company)')

    if (!EVOLUTION_API_KEY) {
      console.warn('[WhatsApp] Evolution API não configurada. Pulando envio de WhatsApp.')
      return false
    }

    const message = generateDefaultMessage(data)
    return sendWhatsAppMessage({
      phone: data.clientPhone,
      message,
      orderNumber: data.orderNumber,
    })
  }

  // Verificar se a instância está conectada
  if (!config.isConnected) {
    console.warn('[WhatsApp] Instância não está conectada. Pulando envio.')
    return false
  }

  // Usar template personalizado ou padrão
  let message: string
  if (config.templates && config.templates.length > 0) {
    console.log('[WhatsApp] Usando template personalizado:', config.templates[0].name)
    message = replaceTemplateVariables(config.templates[0].content, data)
  } else {
    console.log('[WhatsApp] Usando template padrão')
    message = generateDefaultMessage(data)
  }

  console.log('[WhatsApp] Mensagem gerada:')
  console.log('[WhatsApp] -------- INÍCIO DA MENSAGEM --------')
  console.log(message)
  console.log('[WhatsApp] -------- FIM DA MENSAGEM --------')

  const result = await sendWhatsAppMessage({
    phone: data.clientPhone,
    message,
    configId: config.id,
    orderNumber: data.orderNumber,
  })

  console.log('[WhatsApp] Resultado do envio:', result)
  return result
}

// Verifica se a instância do WhatsApp está conectada
export async function checkWhatsAppConnection(companyId?: string): Promise<boolean> {
  try {
    let apiUrl = EVOLUTION_API_URL
    let apiKey = EVOLUTION_API_KEY
    let instanceName = EVOLUTION_INSTANCE

    if (companyId) {
      try {
        const config = await prisma.whatsAppConfig.findUnique({
          where: { companyId },
        })
        if (config) {
          apiUrl = config.apiUrl
          apiKey = config.apiKey
          instanceName = config.instanceName
        }
      } catch {
        // Tabela pode não existir
      }
    }

    // Normalizar URL para evitar barras duplas
    apiUrl = normalizeUrl(apiUrl)

    const response = await axios.get(
      `${apiUrl}/instance/connectionState/${instanceName}`,
      {
        headers: { apikey: apiKey },
        timeout: 10000,
      }
    )

    const state = response.data?.instance?.state
    const isConnected = state === 'open'

    // Atualizar status no banco
    if (companyId) {
      try {
        await prisma.whatsAppConfig.update({
          where: { companyId },
          data: {
            isConnected,
            phoneNumber: response.data?.instance?.ownerJid?.replace('@s.whatsapp.net', '') || null,
          },
        })
      } catch {
        // Tabela pode não existir
      }
    }

    return isConnected
  } catch (error) {
    console.error('[WhatsApp] Erro ao verificar conexão:', error)
    return false
  }
}

// Obtém o QR Code para conectar a instância
export async function getWhatsAppQRCode(companyId?: string): Promise<string | null> {
  try {
    let apiUrl = EVOLUTION_API_URL
    let apiKey = EVOLUTION_API_KEY
    let instanceName = EVOLUTION_INSTANCE

    if (companyId) {
      try {
        const config = await prisma.whatsAppConfig.findUnique({
          where: { companyId },
        })
        if (config) {
          apiUrl = config.apiUrl
          apiKey = config.apiKey
          instanceName = config.instanceName
        }
      } catch {
        // Tabela pode não existir
      }
    }

    // Normalizar URL para evitar barras duplas
    apiUrl = normalizeUrl(apiUrl)

    const response = await axios.get(
      `${apiUrl}/instance/connect/${instanceName}`,
      {
        headers: { apikey: apiKey },
        timeout: 30000,
      }
    )

    return response.data?.qrcode?.base64 || response.data?.base64 || null
  } catch (error) {
    console.error('[WhatsApp] Erro ao obter QR Code:', error)
    return null
  }
}

// Envia documento via Evolution API
async function sendWhatsAppDocument({
  phone,
  documentBase64,
  fileName,
  caption,
  configId,
  orderNumber,
}: SendDocumentParams): Promise<boolean> {
  let apiUrl = EVOLUTION_API_URL
  let apiKey = EVOLUTION_API_KEY
  let instanceName = EVOLUTION_INSTANCE

  // Buscar configuração personalizada
  if (configId) {
    try {
      const config = await prisma.whatsAppConfig.findUnique({
        where: { id: configId },
      })
      if (config) {
        apiUrl = config.apiUrl
        apiKey = config.apiKey
        instanceName = config.instanceName
      }
    } catch (e) {
      console.error('[WhatsApp] Erro ao buscar config:', e)
    }
  }

  if (!apiKey) {
    console.warn('[WhatsApp] API Key não configurada')
    return false
  }

  const formattedPhone = formatPhoneNumber(phone)

  // Normalizar URL para evitar barras duplas
  apiUrl = normalizeUrl(apiUrl)

  console.log('[WhatsApp] ========== ENVIANDO DOCUMENTO ==========')
  console.log('[WhatsApp] Telefone:', formattedPhone)
  console.log('[WhatsApp] Arquivo:', fileName)
  console.log('[WhatsApp] URL:', `${apiUrl}/message/sendMedia/${instanceName}`)

  try {
    const response = await axios.post(
      `${apiUrl}/message/sendMedia/${instanceName}`,
      {
        number: formattedPhone,
        mediatype: 'document',
        mimetype: 'application/pdf',
        caption: caption || '',
        fileName: fileName,
        media: documentBase64,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
        timeout: 60000,
      }
    )

    console.log('[WhatsApp] Resposta status:', response.status)

    // Registrar log
    if (configId) {
      try {
        await prisma.messageLog.create({
          data: {
            phone: formattedPhone,
            message: `[PDF] ${fileName}${caption ? ` - ${caption}` : ''}`,
            status: response.status === 200 || response.status === 201 ? 'SENT' : 'FAILED',
            orderNumber,
            sentAt: new Date(),
            whatsappConfigId: configId,
          },
        })
      } catch (logError) {
        console.error('[WhatsApp] Erro ao salvar log:', logError)
      }
    }

    if (response.status === 200 || response.status === 201) {
      console.log(`[WhatsApp] ✅ Documento enviado com sucesso para ${formattedPhone}`)
      return true
    }

    console.error('[WhatsApp] ❌ Resposta inesperada:', response.status)
    return false
  } catch (error) {
    // Registrar erro no log
    if (configId) {
      try {
        await prisma.messageLog.create({
          data: {
            phone: formattedPhone,
            message: `[PDF] ${fileName}${caption ? ` - ${caption}` : ''}`,
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
            orderNumber,
            whatsappConfigId: configId,
          },
        })
      } catch (logError) {
        console.error('[WhatsApp] Erro ao salvar log de erro:', logError)
      }
    }

    if (axios.isAxiosError(error)) {
      console.error('[WhatsApp] ❌ Erro ao enviar documento:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      })
    } else {
      console.error('[WhatsApp] ❌ Erro ao enviar documento:', error)
    }
    return false
  }
}

// Envia notificação de pagamento com PDF da OS via WhatsApp
export async function sendOrderPaidWhatsApp(data: OrderPaidMessageData): Promise<boolean> {
  console.log('[WhatsApp] ========== ENVIANDO OS PAGA ==========')
  console.log('[WhatsApp] Telefone:', data.clientPhone)
  console.log('[WhatsApp] Company ID:', data.companyId)
  console.log('[WhatsApp] OS:', data.orderNumber)

  // Buscar configuração WhatsApp da company
  let config = null
  try {
    config = await prisma.whatsAppConfig.findUnique({
      where: { companyId: data.companyId },
    })
  } catch (e) {
    console.log('[WhatsApp] Erro ao buscar config:', e)
  }

  // Se não há configuração para esta company, usar configuração global
  if (!config) {
    console.log('[WhatsApp] Usando configuração global (sem config da company)')

    if (!EVOLUTION_API_KEY) {
      console.warn('[WhatsApp] Evolution API não configurada. Pulando envio de WhatsApp.')
      return false
    }
  } else if (!config.isConnected) {
    console.warn('[WhatsApp] Instância não está conectada. Pulando envio.')
    return false
  }

  // Gerar PDF
  console.log('[WhatsApp] Gerando PDF da OS...')
  const pdfData: OrderPdfData = {
    orderNumber: data.orderNumber,
    clientName: data.clientName,
    clientPhone: data.clientPhone,
    clientEmail: data.clientEmail,
    storeName: data.storeName,
    companyName: data.companyName,
    services: data.services.map(s => ({
      name: s.name,
      price: s.price,
      quantity: s.quantity,
      description: s.description,
    })),
    totalAmount: data.totalAmount,
    createdAt: data.createdAt,
    finishedAt: data.finishedAt,
    paidAt: data.paidAt,
    description: data.description,
  }

  let pdfBase64: string
  try {
    pdfBase64 = generateOrderPdfBase64(pdfData)
    console.log('[WhatsApp] PDF gerado com sucesso')
  } catch (pdfError) {
    console.error('[WhatsApp] Erro ao gerar PDF:', pdfError)
    return false
  }

  // Mensagem de agradecimento
  const caption = `💚 *Pagamento Confirmado!*

Olá, *${data.clientName}*!

Agradecemos pela preferência! Seu pagamento foi confirmado.

📋 *OS:* #${data.orderNumber}
💰 *Total:* R$ ${data.totalAmount.toFixed(2)}

Segue em anexo o comprovante da sua ordem de serviço.

_${data.companyName}_
_Obrigado pela confiança!_`

  // Enviar documento
  const result = await sendWhatsAppDocument({
    phone: data.clientPhone,
    documentBase64: pdfBase64,
    fileName: `OS_${data.orderNumber}.pdf`,
    caption,
    configId: config?.id,
    orderNumber: data.orderNumber,
  })

  console.log('[WhatsApp] Resultado do envio:', result)
  return result
}
