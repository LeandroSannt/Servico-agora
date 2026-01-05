import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { ServiceFormData } from '@/lib/validations'

interface Service {
  id: string
  name: string
  description: string | null
  price: number
  isActive: boolean
  storeId: string
  store: { id: string; name: string }
  createdAt: string
}

interface ServicesResponse {
  data: Service[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface UseServicesParams {
  search?: string
  storeId?: string
  page?: number
  limit?: number
}

export function useServices(params: UseServicesParams = {}) {
  const { search = '', storeId, page = 1, limit = 50 } = params

  return useQuery<ServicesResponse>({
    queryKey: ['services', { search, storeId, page, limit }],
    queryFn: async () => {
      const { data } = await axios.get('/api/services', {
        params: { search, storeId, page, limit },
      })
      return data
    },
  })
}

export function useService(id: string | null) {
  return useQuery<Service>({
    queryKey: ['service', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/services/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const response = await axios.post('/api/services', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
    },
  })
}

export function useUpdateService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServiceFormData> }) => {
      const response = await axios.put(`/api/services/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      queryClient.invalidateQueries({ queryKey: ['service', variables.id] })
    },
  })
}

export function useDeleteService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(`/api/services/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
    },
  })
}
