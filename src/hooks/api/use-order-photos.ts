import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

export interface OrderPhoto {
  id: string
  createdAt: string
}

/** URL da imagem da foto (GET binário; usar como src). */
export function orderPhotoUrl(orderId: string, photoId: string) {
  return `/api/orders/${orderId}/photos/${photoId}`
}

export function useOrderPhotos(orderId: string | null | undefined) {
  return useQuery<OrderPhoto[]>({
    queryKey: ['order-photos', orderId],
    queryFn: async () => (await axios.get(`/api/orders/${orderId}/photos`)).data,
    enabled: !!orderId,
  })
}

function useInvalidate(orderId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['order-photos', orderId] })
}

export function useUploadOrderPhoto(orderId: string) {
  const invalidate = useInvalidate(orderId)
  return useMutation({
    mutationFn: async (dataUrl: string) =>
      (await axios.post(`/api/orders/${orderId}/photos`, { dataUrl })).data as OrderPhoto,
    onSuccess: invalidate,
  })
}

export function useDeleteOrderPhoto(orderId: string) {
  const invalidate = useInvalidate(orderId)
  return useMutation({
    mutationFn: async (photoId: string) =>
      (await axios.delete(`/api/orders/${orderId}/photos/${photoId}`)).data as { ok: true },
    onSuccess: invalidate,
  })
}
