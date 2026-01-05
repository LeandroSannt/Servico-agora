'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Select, Textarea } from '@/components/ui'
import { clientSchema, type ClientFormData } from '@/lib/validations'
import { useCreateClient, useUpdateClient, useStores } from '@/hooks/api'
import { useEffect } from 'react'

interface ClientFormProps {
  client?: {
    id: string
    name: string
    email: string | null
    phone: string
    document: string | null
    address: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    notes: string | null
    store: { id: string; name: string }
  } | null
  onSuccess: () => void
  onCancel: () => void
}

export default function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()

  const isLoading = createMutation.isPending || updateMutation.isPending

  const { data: storesData } = useStores({ limit: 100 })
  const stores = storesData?.data || []

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name || '',
      email: client?.email || '',
      phone: client?.phone || '',
      document: client?.document || '',
      address: client?.address || '',
      city: client?.city || '',
      state: client?.state || '',
      zipCode: client?.zipCode || '',
      notes: client?.notes || '',
      storeId: client?.store?.id || '',
    },
  })

  // Handle mutation errors
  useEffect(() => {
    if (createMutation.error || updateMutation.error) {
      const error = createMutation.error || updateMutation.error
      const axiosError = error as { response?: { data?: { error?: string } } } | null
      setError('root', {
        message: axiosError?.response?.data?.error || 'Erro ao salvar cliente',
      })
    }
  }, [createMutation.error, updateMutation.error, setError])

  const onSubmit = async (data: ClientFormData) => {
    try {
      if (client) {
        await updateMutation.mutateAsync({ id: client.id, data })
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
        label="Loja"
        options={stores.map((s) => ({ value: s.id, label: s.name }))}
        placeholder="Selecione a loja"
        error={errors.storeId?.message}
        {...register('storeId')}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nome"
          placeholder="Nome completo"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Telefone"
          placeholder="(00) 00000-0000"
          mask="phone"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="email@exemplo.com"
          {...register('email')}
        />
        <Input
          label="CPF/CNPJ"
          placeholder="000.000.000-00"
          mask="cpfCnpj"
          {...register('document')}
        />
      </div>

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
            mask="cep"
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

      <Textarea
        label="Observações"
        placeholder="Informações adicionais sobre o cliente..."
        {...register('notes')}
      />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto">
          {client ? 'Salvar Alterações' : 'Cadastrar Cliente'}
        </Button>
      </div>
    </form>
  )
}
