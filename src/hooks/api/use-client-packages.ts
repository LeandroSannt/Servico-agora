import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { SellPackageFormData } from '@/lib/validations'

export interface ServiceBalance {
  serviceId: string
  serviceName: string
  remaining: number
}

export interface ClientPackage {
  id: string
  name: string
  serviceId: string
  serviceName: string
  quantity: number
  used: number
  remaining: number
  price: number
  status: 'ACTIVE' | 'CANCELLED'
  soldAt: string
  cancelledAt: string | null
  soldBy: { name: string } | null
  notes: string | null
  usages: { quantity: number; createdAt: string; order: { id: string; orderNumber: string; status: string } }[]
}

export interface ClientPackagesResponse {
  balances: ServiceBalance[]
  packages: ClientPackage[]
}

export function useClientPackages(clientId: string | null | undefined) {
  return useQuery<ClientPackagesResponse>({
    queryKey: ['client-packages', clientId],
    queryFn: async () => (await axios.get(`/api/clients/${clientId}/packages`)).data,
    enabled: !!clientId,
  })
}

function invalidateAfterSale(queryClient: ReturnType<typeof useQueryClient>, clientId: string) {
  queryClient.invalidateQueries({ queryKey: ['client-packages', clientId] })
  queryClient.invalidateQueries({ queryKey: ['clients'] })
  queryClient.invalidateQueries({ queryKey: ['packages'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
}

export function useSellPackage(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: SellPackageFormData) => (await axios.post(`/api/clients/${clientId}/packages`, data)).data,
    onSuccess: () => invalidateAfterSale(queryClient, clientId),
  })
}

export function useCancelClientPackage(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (clientPackageId: string) =>
      (await axios.delete(`/api/clients/${clientId}/packages/${clientPackageId}`)).data,
    onSuccess: () => invalidateAfterSale(queryClient, clientId),
  })
}
