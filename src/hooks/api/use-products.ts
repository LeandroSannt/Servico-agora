import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import axios from 'axios'
import type { ProductFormData } from '@/lib/validations'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  isActive: boolean
  storeId: string
  store: { id: string; name: string }
  createdAt: string
}

interface ProductsResponse {
  data: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface UseProductsParams {
  search?: string
  storeId?: string
  active?: boolean
  page?: number
  limit?: number
}

export function useProducts(params: UseProductsParams = {}) {
  const { search = '', storeId, active, page = 1, limit = 50 } = params

  return useQuery<ProductsResponse>({
    queryKey: ['products', { search, storeId, active, page, limit }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data } = await axios.get('/api/products', {
        params: { search, storeId, active: active ? 1 : undefined, page, limit },
      })
      return data
    },
  })
}

export function useProduct(id: string | null) {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/products/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await axios.post('/api/products', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductFormData> }) => {
      const response = await axios.put(`/api/products/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(`/api/products/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
