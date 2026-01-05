import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { ClientFormData } from '@/lib/validations'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string
  document: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  notes: string | null
  storeId: string
  store: { id: string; name: string }
  createdAt: string
  _count?: {
    serviceOrders: number
  }
}

interface ClientsResponse {
  data: Client[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface UseClientsParams {
  search?: string
  storeId?: string
  page?: number
  limit?: number
}

export function useClients(params: UseClientsParams = {}) {
  const { search = '', storeId, page = 1, limit = 10 } = params

  return useQuery<ClientsResponse>({
    queryKey: ['clients', { search, storeId, page, limit }],
    queryFn: async () => {
      const { data } = await axios.get('/api/clients', {
        params: { search, storeId, page, limit },
      })
      return data
    },
  })
}

export function useClient(id: string | null) {
  return useQuery<Client>({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/clients/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ClientFormData) => {
      const response = await axios.post('/api/clients', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClientFormData> }) => {
      const response = await axios.put(`/api/clients/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] })
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(`/api/clients/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
