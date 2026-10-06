import type { OrderStatus } from '@prisma/client'

// ==================== DADOS DAS NOTIFICAÇÕES ====================

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

export interface OrderPaidMessageData {
  clientName: string
  clientPhone: string
  clientEmail?: string | null
  orderNumber: string
  storeName: string
  companyName: string
  companyId: string
  services: { name: string; price: number; quantity: number; description?: string | null; equipments?: string[] }[]
  products?: { name: string; quantity: number; unitPrice: number }[]
  totalAmount: number
  description?: string | null
  createdAt: Date | string
  finishedAt?: Date | string | null
  paidAt?: Date | string | null
}

// Variáveis disponíveis para renderizar textos e preencher templates da Meta
export type TemplateVars = Record<
  | 'clientName'
  | 'orderNumber'
  | 'storeName'
  | 'companyName'
  | 'services' // uma linha, separada por "; " (Meta)
  | 'servicesMultiline' // várias linhas com "  • " (Evolution)
  | 'totalAmount' // 1.234,56 (Meta)
  | 'totalAmountFixed' // 1234.56 (Evolution, comportamento atual)
  | 'pausedReason' // texto puro ou "Não informado" (Meta)
  | 'pausedReasonBlock' // "\n📝 *Motivo:* ...\n" ou vazio (Evolution)
  | 'status',
  string
>

// ==================== PROVEDOR ====================

export type SendResult = { ok: boolean; providerMessageId?: string; error?: string }

export type ConnectionResult = { connected: boolean; phoneNumber?: string | null; error?: string }

export type TemplateRef =
  | { kind: 'text'; text: string } // Evolution: texto já renderizado
  | { kind: 'meta'; name: string; language: string; params: string[] } // Meta: template aprovado + variáveis

export interface MetaTemplateDefinition {
  name: string
  language: string
  category: 'UTILITY'
  bodyText: string
  bodyExamples: string[]
  headerDocument?: { examplePdf: Buffer; fileName: string }
}

export interface MetaTemplateResult {
  name: string
  status: string // status bruto da Meta (APPROVED, PENDING, REJECTED, ...)
  rejectedReason?: string
  error?: string
}

export type MetaTemplateStatusMap = Record<string, { status: string; rejectedReason?: string }>

export interface MessagingProvider {
  readonly name: 'EVOLUTION' | 'META' | 'META_MOCK'
  sendMessage(input: { phone: string; template: TemplateRef }): Promise<SendResult>
  sendDocument(input: { phone: string; template: TemplateRef; pdf: Buffer; fileName: string }): Promise<SendResult>
  checkConnection(): Promise<ConnectionResult>
  // Só Evolution
  ensureInstanceAndGetQRCode?(): Promise<string | null>
  disconnect?(): Promise<void>
  // Só Meta
  createTemplates?(defs: MetaTemplateDefinition[]): Promise<MetaTemplateResult[]>
  getTemplateStatuses?(names: string[]): Promise<MetaTemplateStatusMap>
}
