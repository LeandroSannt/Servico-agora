import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { ServicePackageFormData } from '@/lib/validations'

export interface ServicePackage {
  id: string
  name: string
  description: string | null
  quantity: number
  price: number
  unitPrice: number
  savingsPercent: number
  isActive: boolean
  storeId: string
  serviceId: string
  store: { id: string; name: string }
  service: { id: string; name: string; price: number; isActive: boolean }
  _count: { sales: number }
  createdAt: string
}

interface UsePackagesParams {
  search?: string
  storeId?: string
  sellable?: boolean
  enabled?: boolean
}

export function usePackages(params: UsePackagesParams = {}) {
  const { search = '', storeId, sellable, enabled = true } = params
  return useQuery<{ data: ServicePackage[] }>({
    queryKey: ['packages', { search, storeId, sellable }],
    queryFn: async () => {
      const { data } = await axios.get('/api/packages', {
        params: { search, storeId, sellable: sellable ? 'true' : undefined },
      })
      return data
    },
    enabled,
  })
}

export function useCreatePackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: ServicePackageFormData) => (await axios.post('/api/packages', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packages'] }),
  })
}

export function useUpdatePackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServicePackageFormData> }) =>
      (await axios.put(`/api/packages/${id}`, data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packages'] }),
  })
}

export function useDeletePackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await axios.delete(`/api/packages/${id}`)).data as { message: string },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packages'] }),
  })
}
