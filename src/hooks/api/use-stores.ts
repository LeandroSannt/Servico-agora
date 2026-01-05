import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { StoreFormData } from '@/lib/validations'

interface Store {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  isActive: boolean
  companyId: string
  company: {
    id: string
    name: string
  }
  createdAt: string
  _count?: {
    users: number
    clients: number
    services: number
    serviceOrders: number
  }
}

interface StoresResponse {
  data: Store[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface UseStoresParams {
  search?: string
  companyId?: string
  page?: number
  limit?: number
}

export function useStores(params: UseStoresParams = {}) {
  const { search = '', companyId, page = 1, limit = 10 } = params

  return useQuery<StoresResponse>({
    queryKey: ['stores', { search, companyId, page, limit }],
    queryFn: async () => {
      const { data } = await axios.get('/api/stores', {
        params: { search, companyId, page, limit },
      })
      return data
    },
  })
}

export function useStore(id: string | null) {
  return useQuery<Store>({
    queryKey: ['store', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/stores/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateStore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: StoreFormData) => {
      const response = await axios.post('/api/stores', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}

export function useUpdateStore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StoreFormData> }) => {
      const response = await axios.put(`/api/stores/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      queryClient.invalidateQueries({ queryKey: ['store', variables.id] })
    },
  })
}

export function useDeleteStore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(`/api/stores/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}
