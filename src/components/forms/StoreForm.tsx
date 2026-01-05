'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Select } from '@/components/ui'
import { storeSchema, type StoreFormData } from '@/lib/validations'
import { useCreateStore, useUpdateStore } from '@/hooks/api'
import { useEffect } from 'react'

interface StoreFormProps {
  store?: {
    id: string
    name: string
    phone: string | null
    email: string | null
    address: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    company: {
      id: string
      name: string
    }
  } | null
  companies: { id: string; name: string }[]
  onSuccess: () => void
  onCancel: () => void
}

export default function StoreForm({ store, companies, onSuccess, onCancel }: StoreFormProps) {
  const createMutation = useCreateStore()
  const updateMutation = useUpdateStore()

  const isLoading = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: store?.name || '',
      phone: store?.phone || '',
      email: store?.email || '',
      address: store?.address || '',
      city: store?.city || '',
      state: store?.state || '',
      zipCode: store?.zipCode || '',
      companyId: store?.company?.id || '',
    },
  })

  // Handle mutation errors
  useEffect(() => {
    if (createMutation.error || updateMutation.error) {
      const error = createMutation.error || updateMutation.error
      const axiosError = error as { response?: { data?: { error?: string } } } | null
      setError('root', {
        message: axiosError?.response?.data?.error || 'Erro ao salvar loja',
      })
    }
  }, [createMutation.error, updateMutation.error, setError])

  const onSubmit = async (data: StoreFormData) => {
    try {
      if (store) {
        await updateMutation.mutateAsync({ id: store.id, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      onSuccess()
    } catch {
      // Error is handled by useEffect above
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {errors.root && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errors.root.message}
        </div>
      )}

      <Select
        label="Empresa"
        options={companies.map((c) => ({ value: c.id, label: c.name }))}
        placeholder="Selecione a empresa"
        error={errors.companyId?.message}
        {...register('companyId')}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nome da Loja"
          placeholder="Ex: Loja Centro"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Telefone"
          placeholder="(00) 00000-0000"
          {...register('phone')}
        />
      </div>

      <Input
        label="Email"
        type="email"
        placeholder="email@loja.com"
        {...register('email')}
      />

      {/* Endereço */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Endereço"
            placeholder="Rua, número"
            {...register('address')}
          />
          <Input
            label="CEP"
            placeholder="00000-000"
            {...register('zipCode')}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Input
            label="Cidade"
            placeholder="Cidade"
            {...register('city')}
          />
          <Input
            label="Estado"
            placeholder="UF"
            {...register('state')}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto">
          {store ? 'Salvar Alterações' : 'Criar Loja'}
        </Button>
      </div>
    </form>
  )
}
