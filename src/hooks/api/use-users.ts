import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { UserFormData, UserUpdateFormData } from '@/lib/validations'

interface User {
  id: string
  name: string
  email: string
  phone: string | null
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'EMPLOYEE'
  isActive: boolean
  companyId: string | null
  storeId: string | null
  company: { id: string; name: string } | null
  store: { id: string; name: string } | null
  createdAt: string
}

interface UsersResponse {
  data: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface UseUsersParams {
  search?: string
  companyId?: string
  storeId?: string
  role?: string
  page?: number
  limit?: number
}

export function useUsers(params: UseUsersParams = {}) {
  const { search = '', companyId, storeId, role, page = 1, limit = 10 } = params

  return useQuery<UsersResponse>({
    queryKey: ['users', { search, companyId, storeId, role, page, limit }],
    queryFn: async () => {
      const { data } = await axios.get('/api/users', {
        params: { search, companyId, storeId, role, page, limit },
      })
      return data
    },
  })
}

export function useUser(id: string | null) {
  return useQuery<User>({
    queryKey: ['user', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/users/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UserFormData) => {
      const response = await axios.post('/api/users', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UserUpdateFormData }) => {
      const response = await axios.put(`/api/users/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(`/api/users/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
