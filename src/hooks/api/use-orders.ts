import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { ServiceOrderFormData } from '@/lib/validations'

interface OrderService {
  id: string
  serviceName: string
  description: string | null
  price: number
  quantity: number
}

interface Order {
  id: string
  orderNumber: string
  description: string | null
  status: 'RECEIVED' | 'IN_PROGRESS' | 'PAUSED' | 'FINISHED' | 'PAID'
  totalAmount: number
  clientId: string
  storeId: string
  client: { id: string; name: string; phone: string; email: string | null }
  store: { id: string; name: string }
  createdBy: { id: string; name: string } | null
  services: OrderService[]
  createdAt: string
  updatedAt: string
}

interface OrdersResponse {
  data: Order[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface UseOrdersParams {
  search?: string
  status?: string
  storeId?: string
  clientId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export function useOrders(params: UseOrdersParams = {}) {
  const { search = '', status, storeId, clientId, startDate, endDate, page = 1, limit = 10 } = params

  return useQuery<OrdersResponse>({
    queryKey: ['orders', { search, status, storeId, clientId, startDate, endDate, page, limit }],
    queryFn: async () => {
      const { data } = await axios.get('/api/orders', {
        params: { search, status, storeId, clientId, startDate, endDate, page, limit },
      })
      return data
    },
  })
}

export function useOrder(id: string | null) {
  return useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/orders/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ServiceOrderFormData) => {
      const response = await axios.post('/api/orders', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['services'] }) // Invalidar serviços caso novos tenham sido salvos
    },
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServiceOrderFormData> }) => {
      const response = await axios.put(`/api/orders/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['services'] }) // Invalidar serviços caso novos tenham sido salvos
    },
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status, pausedReason }: { id: string; status: string; pausedReason?: string }) => {
      const response = await axios.patch(`/api/orders/${id}`, { status, pausedReason })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(`/api/orders/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}
