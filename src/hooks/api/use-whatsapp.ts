import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { MessageStatus, OrderStatus } from '@prisma/client'
import type { WhatsAppConfigFormData, WhatsAppConfigUpdateData } from '@/lib/validations/whatsapp'

// ==================== TIPOS ====================

export type WhatsAppProviderName = 'EVOLUTION' | 'META'
export type MetaTemplateStatusName = 'NOT_CREATED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED'

export interface WhatsAppConfig {
  id: string
  provider: WhatsAppProviderName
  // Evolution
  instanceName: string | null
  apiUrl: string
  hasApiKey: boolean
  // Meta (segredos nunca vêm da API)
  metaPhoneNumberId: string | null
  metaWabaId: string | null
  metaAppId: string | null
  hasMetaAccessToken: boolean
  metaAccessTokenHint: string | null
  // Estado
  isConnected: boolean
  phoneNumber: string | null
  companyId: string
  templates: MessageTemplate[]
  mock?: boolean
  _count?: {
    messageLogs: number
  }
}

export interface MessageTemplate {
  id: string
  name: string
  description: string | null
  triggerStatus: OrderStatus
  content: string
  isActive: boolean
  isDefault: boolean
  whatsappConfigId: string
  metaTemplateName: string | null
  metaLanguage: string
  metaStatus: MetaTemplateStatusName
  metaRejectReason: string | null
}

interface MessageLog {
  id: string
  phone: string
  message: string
  status: MessageStatus
  errorMessage: string | null
  orderNumber: string | null
  providerMessageId: string | null
  sentAt: string | null
  deliveredAt: string | null
  createdAt: string
}

interface MessageLogsResponse {
  data: MessageLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: {
    total: number
    pending: number
    sent: number
    delivered: number
    read: number
    failed: number
  }
}

interface QRCodeResponse {
  connected: boolean
  state: string
  qrCode?: string
  phoneNumber?: string
  message: string
}

export interface ConnectionStatusResponse {
  connected: boolean
  state: string
  phoneNumber?: string
  error?: string
}

export interface MetaTemplateSyncResult {
  name: string
  status: string
  rejectedReason?: string
  error?: string
}

// ==================== CONFIG HOOKS ====================

// Hook para buscar configuração WhatsApp
export function useWhatsAppConfig(companyId?: string) {
  return useQuery<WhatsAppConfig | null>({
    queryKey: ['whatsapp-config', companyId],
    queryFn: async () => {
      const params = companyId ? `?companyId=${companyId}` : ''
      const { data } = await axios.get(`/api/whatsapp/config${params}`)
      return data
    },
    retry: false,
  })
}

// Hook para criar configuração
export function useCreateWhatsAppConfig() {
  const queryClient = useQueryClient()

  return useMutation<WhatsAppConfig, Error, WhatsAppConfigFormData>({
    mutationFn: async (data) => {
      const response = await axios.post('/api/whatsapp/config', data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config', variables.companyId] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] })
    },
  })
}

// Hook para atualizar configuração
export function useUpdateWhatsAppConfig() {
  const queryClient = useQueryClient()

  return useMutation<WhatsAppConfig, Error, WhatsAppConfigUpdateData & { id: string }>({
    mutationFn: async (data) => {
      const response = await axios.put('/api/whatsapp/config', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] })
    },
  })
}

// Hook para deletar configuração
export function useDeleteWhatsAppConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(`/api/whatsapp/config?id=${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] })
    },
  })
}

// ==================== TEMPLATE HOOKS ====================

// Hook para listar templates
export function useMessageTemplates(configId?: string) {
  return useQuery<MessageTemplate[]>({
    queryKey: ['whatsapp-templates', configId],
    queryFn: async () => {
      if (!configId) return []
      const { data } = await axios.get(`/api/whatsapp/templates?configId=${configId}`)
      return data
    },
    enabled: !!configId,
  })
}

// Hook para criar template
export function useCreateMessageTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string
      triggerStatus: OrderStatus
      content?: string
      isActive?: boolean
      whatsappConfigId: string
      metaTemplateName?: string
      metaLanguage?: string
    }) => {
      const response = await axios.post('/api/whatsapp/templates', data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', variables.whatsappConfigId] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] })
    },
  })
}

// Hook para atualizar template
export function useUpdateMessageTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      id: string
      name?: string
      description?: string
      triggerStatus?: OrderStatus
      content?: string
      isActive?: boolean
      metaTemplateName?: string
      metaLanguage?: string
    }) => {
      const response = await axios.put('/api/whatsapp/templates', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] })
    },
  })
}

// Hook para deletar template
export function useDeleteMessageTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(`/api/whatsapp/templates?id=${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] })
    },
  })
}

// Hook para criar na Meta os templates ainda não criados
export function useSyncMetaTemplates() {
  const queryClient = useQueryClient()

  return useMutation<{ results: MetaTemplateSyncResult[]; templates: MessageTemplate[] }, Error, { companyId: string }>({
    mutationFn: async ({ companyId }) => {
      const { data } = await axios.post('/api/whatsapp/templates/sync', { companyId })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] })
    },
  })
}

// Hook para atualizar o status de aprovação dos templates a partir da Meta
export function useRefreshMetaTemplateStatus() {
  const queryClient = useQueryClient()

  return useMutation<{ templates: MessageTemplate[] }, Error, { companyId: string }>({
    mutationFn: async ({ companyId }) => {
      const { data } = await axios.get(`/api/whatsapp/templates/sync?companyId=${companyId}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] })
    },
  })
}

// ==================== LOGS HOOKS ====================

// Hook para listar logs
export function useMessageLogs(params?: {
  companyId?: string
  page?: number
  limit?: number
  status?: MessageStatus
}) {
  return useQuery<MessageLogsResponse>({
    queryKey: ['whatsapp-logs', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.companyId) searchParams.set('companyId', params.companyId)
      if (params?.page) searchParams.set('page', params.page.toString())
      if (params?.limit) searchParams.set('limit', params.limit.toString())
      if (params?.status) searchParams.set('status', params.status)

      const { data } = await axios.get(`/api/whatsapp/logs?${searchParams}`)
      return data
    },
  })
}

// ==================== QR CODE / CONNECTION HOOKS ====================

// Hook para obter QR Code (só Evolution)
export function useWhatsAppQRCode(companyId?: string) {
  return useQuery<QRCodeResponse>({
    queryKey: ['whatsapp-qrcode', companyId],
    queryFn: async () => {
      const params = companyId ? `?companyId=${companyId}` : ''
      const { data } = await axios.get(`/api/whatsapp/qrcode${params}`)
      return data
    },
    enabled: false, // Não buscar automaticamente
    retry: false,
  })
}

// Hook para verificar status da conexão (qualquer provedor)
export function useCheckWhatsAppConnection() {
  const queryClient = useQueryClient()

  return useMutation<ConnectionStatusResponse, Error, { companyId?: string }>({
    mutationFn: async ({ companyId }) => {
      const { data } = await axios.post('/api/whatsapp/qrcode', { companyId })
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config', variables.companyId] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-qrcode', variables.companyId] })
    },
  })
}

// Hook para desconectar WhatsApp (só Evolution)
export function useDisconnectWhatsApp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (companyId?: string) => {
      const params = companyId ? `?companyId=${companyId}` : ''
      const { data } = await axios.delete(`/api/whatsapp/qrcode${params}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-qrcode'] })
    },
  })
}

// ==================== STATUS GLOBAL / TESTE ====================

export interface WhatsAppStatus {
  connected: boolean
  qrCode: string | null
  message: string
  mock?: boolean
  error?: string
}

interface TestMessageResponse {
  success: boolean
  message?: string
  error?: string
}

// Hook para verificar o status do provedor global (.env)
export function useWhatsAppStatus() {
  return useQuery<WhatsAppStatus>({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const { data } = await axios.get('/api/whatsapp/status')
      return data
    },
    refetchInterval: 30000,
    retry: false,
  })
}

// Hook para enviar mensagem de teste (template FINISHED) pela config da empresa
export function useTestWhatsAppMessage() {
  const queryClient = useQueryClient()

  return useMutation<TestMessageResponse, Error, { phone: string; companyId?: string }>({
    mutationFn: async ({ phone, companyId }) => {
      const { data } = await axios.post('/api/whatsapp/test', { phone, companyId })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-logs'] })
    },
  })
}
