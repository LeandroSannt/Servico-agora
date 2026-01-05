import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { CompanyFormData } from '@/lib/validations'

interface Company {
  id: string
  name: string
  cnpj: string | null
  managerName: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  primaryColor: string | null
  secondaryColor: string | null
  logoUrl: string | null
  isActive: boolean
  createdAt: string
  _count?: {
    stores: number
    users: number
  }
}

interface CompaniesResponse {
  data: Company[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface UseCompaniesParams {
  search?: string
  page?: number
  limit?: number
}

export function useCompanies(params: UseCompaniesParams = {}) {
  const { search = '', page = 1, limit = 10 } = params

  return useQuery<CompaniesResponse>({
    queryKey: ['companies', { search, page, limit }],
    queryFn: async () => {
      const { data } = await axios.get('/api/companies', {
        params: { search, page, limit },
      })
      return data
    },
  })
}

export function useCompany(id: string | null) {
  return useQuery<Company>({
    queryKey: ['company', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/companies/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const response = await axios.post('/api/companies', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CompanyFormData> }) => {
      const response = await axios.put(`/api/companies/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['company', variables.id] })
    },
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(`/api/companies/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}
