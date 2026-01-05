import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { MessageStatus, OrderStatus } from '@prisma/client'

// ==================== TIPOS ====================

interface WhatsAppConfig {
  id: string
  instanceName: string
  apiKey: string
  apiUrl: string
  isConnected: boolean
  phoneNumber: string | null
  companyId: string
  templates: MessageTemplate[]
  _count?: {
    messageLogs: number
  }
}

interface MessageTemplate {
  id: string
  name: string
  description: string | null
  triggerStatus: OrderStatus
  content: string
  isActive: boolean
  isDefault: boolean
  whatsappConfigId: string
}

interface MessageLog {
  id: string
  phone: string
  message: string
  status: MessageStatus
  errorMessage: string | null
  orderNumber: string | null
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

interface ConnectionStatusResponse {
  connected: boolean
  state: string
  phoneNumber?: string
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

  return useMutation({
    mutationFn: async (data: {
      instanceName: string
      apiKey: string
      apiUrl: string
      companyId: string
    }) => {
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

  return useMutation({
    mutationFn: async (data: {
      id: string
      instanceName?: string
      apiKey?: string
      apiUrl?: string
    }) => {
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
      content: string
      isActive?: boolean
      whatsappConfigId: string
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

// Hook para obter QR Code
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

// Hook para verificar status da conexão
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

// Hook para desconectar WhatsApp
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

// ==================== LEGACY HOOKS (mantidos para compatibilidade) ====================

interface WhatsAppStatus {
  connected: boolean
  qrCode: string | null
  message: string
}

interface TestMessageResponse {
  success: boolean
  message?: string
  error?: string
}

// Hook para verificar o status da conexão WhatsApp (legacy)
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

// Hook para enviar mensagem de teste (legacy)
export function useTestWhatsAppMessage() {
  return useMutation<TestMessageResponse, Error, { phone: string }>({
    mutationFn: async ({ phone }) => {
      const { data } = await axios.post('/api/whatsapp/test', { phone })
      return data
    },
  })
}
