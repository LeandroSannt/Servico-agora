import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import axios from 'axios'
import type { EquipmentInput } from '@/lib/validations'

export interface Equipment {
  id: string
  name: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  notes: string | null
  isActive: boolean
  clientId: string
}

export function useClientEquipments(clientId: string | null | undefined, opts: { includeArchived?: boolean } = {}) {
  const includeArchived = !!opts.includeArchived
  return useQuery<Equipment[]>({
    queryKey: ['client-equipments', clientId, includeArchived],
    queryFn: async () =>
      (await axios.get(`/api/clients/${clientId}/equipments`, { params: includeArchived ? { includeArchived: 1 } : {} })).data,
    enabled: !!clientId,
    placeholderData: keepPreviousData,
  })
}

function useInvalidate(clientId: string) {
  const queryClient = useQueryClient()
  // Prefixo: invalida as variantes com e sem arquivados
  return () => queryClient.invalidateQueries({ queryKey: ['client-equipments', clientId] })
}

export function useCreateEquipment(clientId: string) {
  const invalidate = useInvalidate(clientId)
  return useMutation({
    mutationFn: async (data: EquipmentInput) => (await axios.post(`/api/clients/${clientId}/equipments`, data)).data as Equipment,
    onSuccess: invalidate,
  })
}

export function useUpdateEquipment(clientId: string) {
  const invalidate = useInvalidate(clientId)
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EquipmentInput> & { isActive?: boolean } }) =>
      (await axios.patch(`/api/clients/${clientId}/equipments/${id}`, data)).data as Equipment,
    onSuccess: invalidate,
  })
}

export function useDeleteEquipment(clientId: string) {
  const invalidate = useInvalidate(clientId)
  return useMutation({
    mutationFn: async (id: string) =>
      (await axios.delete(`/api/clients/${clientId}/equipments/${id}`)).data as { archived: boolean },
    onSuccess: invalidate,
  })
}
