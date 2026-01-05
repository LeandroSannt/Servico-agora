'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Select } from '@/components/ui'
import { userSchema, userUpdateSchema, type UserFormData, type UserUpdateFormData } from '@/lib/validations'
import { useCreateUser, useUpdateUser, useStores } from '@/hooks/api'
import { useEffect } from 'react'

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'COMPANY_ADMIN', label: 'Admin da Empresa' },
  { value: 'MANAGER', label: 'Gerente' },
  { value: 'EMPLOYEE', label: 'Funcionário' },
]

interface UserFormProps {
  user?: {
    id: string
    name: string
    email: string
    phone: string | null
    role: string
    company: { id: string; name: string } | null
    store: { id: string; name: string } | null
  } | null
  companies: { id: string; name: string }[]
  onSuccess: () => void
  onCancel: () => void
}

export default function UserForm({ user, companies, onSuccess, onCancel }: UserFormProps) {
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()

  const isLoading = createMutation.isPending || updateMutation.isPending

  const schema = user ? userUpdateSchema : userSchema

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    setError,
  } = useForm<UserFormData | UserUpdateFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      password: '',
      phone: user?.phone || '',
      role: (user?.role as 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'EMPLOYEE') || 'EMPLOYEE',
      companyId: user?.company?.id || '',
      storeId: user?.store?.id || '',
    },
  })

  const selectedCompanyId = watch('companyId')
  const selectedRole = watch('role')

  // Buscar lojas da empresa selecionada
  const { data: storesData, isLoading: loadingStores } = useStores({
    companyId: selectedCompanyId || undefined,
    limit: 100,
  })
  const stores = storesData?.data || []

  // Limpar loja selecionada quando mudar a empresa
  useEffect(() => {
    if (!user) {
      setValue('storeId', '')
    }
  }, [selectedCompanyId, setValue, user])

  // Handle mutation errors
  useEffect(() => {
    if (createMutation.error || updateMutation.error) {
      const error = createMutation.error || updateMutation.error
      const axiosError = error as { response?: { data?: { error?: string } } } | null
      setError('root', {
        message: axiosError?.response?.data?.error || 'Erro ao salvar usuário',
      })
    }
  }, [createMutation.error, updateMutation.error, setError])

  const onSubmit = async (data: UserFormData | UserUpdateFormData) => {
    try {
      // Remover campos vazios
      const cleanData = { ...data }
      if (!cleanData.password) delete cleanData.password
      if (!cleanData.companyId) delete cleanData.companyId
      if (!cleanData.storeId) delete cleanData.storeId

      if (user) {
        await updateMutation.mutateAsync({ id: user.id, data: cleanData })
      } else {
        await createMutation.mutateAsync(cleanData as UserFormData)
      }
      onSuccess()
    } catch {
      // Error is handled by useEffect above
    }
  }

  const showCompanyField = selectedRole !== 'SUPER_ADMIN'
  const showStoreField = selectedRole === 'MANAGER' || selectedRole === 'EMPLOYEE'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {errors.root && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errors.root.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nome"
          placeholder="Nome completo"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Email"
          type="email"
          placeholder="email@exemplo.com"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label={user ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}
          type="password"
          placeholder="******"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Telefone"
          placeholder="(00) 00000-0000"
          {...register('phone')}
        />
      </div>

      <Select
        label="Função"
        options={ROLES}
        error={errors.role?.message}
        {...register('role')}
      />

      {showCompanyField && (
        <Select
          label="Empresa"
          options={[
            { value: '', label: 'Selecione uma empresa' },
            ...companies.map((c) => ({ value: c.id, label: c.name })),
          ]}
          error={errors.companyId?.message}
          {...register('companyId')}
        />
      )}

      {showStoreField && (
        <Select
          label="Loja"
          options={[
            { value: '', label: loadingStores ? 'Carregando lojas...' : 'Selecione uma loja' },
            ...stores.map((s) => ({ value: s.id, label: s.name })),
          ]}
          error={errors.storeId?.message}
          disabled={!selectedCompanyId || loadingStores}
          {...register('storeId')}
        />
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto">
          {user ? 'Salvar Alterações' : 'Criar Usuário'}
        </Button>
      </div>
    </form>
  )
}
