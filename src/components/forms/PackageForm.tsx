'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSession } from 'next-auth/react'
import { Store } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Textarea, Select } from '@/components/ui'
import { servicePackageSchema, type ServicePackageFormData } from '@/lib/validations'
import { useCreatePackage, useUpdatePackage, useStores, useServices, type ServicePackage } from '@/hooks/api'
import { formatCurrency } from '@/lib/utils'

interface PackageFormProps {
  pkg?: ServicePackage | null
  onSuccess: () => void
  onCancel: () => void
}

export default function PackageForm({ pkg, onSuccess, onCancel }: PackageFormProps) {
  const createMutation = useCreatePackage()
  const updateMutation = useUpdatePackage()
  const isLoading = createMutation.isPending || updateMutation.isPending
  const [nameTouched, setNameTouched] = useState(!!pkg)
  const { data: session } = useSession()
  const userStore = session?.user?.store
  const initialStoreId = pkg?.store.id || userStore?.id || ''

  const { data: storesData } = useStores({ limit: 100 })
  const stores = storesData?.data || []

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitted },
  } = useForm<ServicePackageFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(servicePackageSchema) as any,
    defaultValues: {
      storeId: initialStoreId,
      serviceId: pkg?.service.id || '',
      name: pkg?.name || '',
      description: pkg?.description || '',
      quantity: pkg?.quantity || 10,
      price: pkg?.price || 0,
      isActive: pkg?.isActive ?? true,
    },
  })

  const storeId = watch('storeId')
  const serviceId = watch('serviceId')
  const quantity = Number(watch('quantity')) || 0
  const price = Number(watch('price')) || 0

  const { data: servicesData } = useServices({ storeId, limit: 100 })
  const services = (servicesData?.data || []).filter((s) => s.isActive || s.id === serviceId)
  const service = services.find((s) => s.id === serviceId)
  const servicePrice = Number(service?.price ?? pkg?.service.price ?? 0)

  // Nome sugerido "10× Limpeza" enquanto o usuário não editar o nome
  useEffect(() => {
    if (nameTouched || !service || quantity < 1) return
    setValue('name', `${quantity}× ${service.name}`, { shouldValidate: isSubmitted })
  }, [nameTouched, service, quantity, setValue, isSubmitted])

  useEffect(() => {
    const error = createMutation.error || updateMutation.error
    if (error) {
      const axiosError = error as { response?: { data?: { error?: string } } }
      setError('root', { message: axiosError?.response?.data?.error || 'Erro ao salvar pacote' })
    }
  }, [createMutation.error, updateMutation.error, setError])

  const unitPrice = quantity > 0 ? price / quantity : 0
  const savings = servicePrice > 0 ? Math.round((1 - unitPrice / servicePrice) * 100) : 0

  const onSubmit = async (data: ServicePackageFormData) => {
    const normalized = {
      ...data,
      price: Number(data.price) || 0,
      quantity: Number(data.quantity) || 0,
    }
    try {
      if (pkg) {
        // Loja e serviço são imutáveis; não enviar
        await updateMutation.mutateAsync({
          id: pkg.id,
          data: {
            name: normalized.name,
            description: normalized.description,
            quantity: normalized.quantity,
            price: normalized.price,
            isActive: normalized.isActive,
          },
        })
      } else {
        await createMutation.mutateAsync(normalized)
      }
      onSuccess()
    } catch {
      // tratado no useEffect
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {errors.root && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errors.root.message}</div>
      )}

      {pkg ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Loja</p>
            <p className="font-medium">{pkg.store.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Serviço</p>
            <p className="font-medium">{pkg.service.name}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userStore ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Loja</label>
              <div className="flex items-center gap-2 h-10 px-3 bg-gray-100 border border-gray-300 rounded-lg">
                <Store className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-900">{userStore.name}</span>
              </div>
              <input type="hidden" value={initialStoreId} {...register('storeId')} />
              {errors.storeId?.message && (
                <p className="mt-1.5 text-xs text-red-600">{errors.storeId.message}</p>
              )}
            </div>
          ) : (
            <Select
              id="pkg-store"
              label="Loja"
              options={stores.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Selecione a loja"
              error={errors.storeId?.message}
              {...register('storeId', { onChange: () => setValue('serviceId', '') })}
            />
          )}
          <Select
            id="pkg-service"
            label="Serviço"
            options={services.map((s) => ({ value: s.id, label: `${s.name} — ${formatCurrency(Number(s.price))}` }))}
            placeholder={storeId ? 'Selecione o serviço' : 'Selecione a loja primeiro'}
            disabled={!storeId}
            error={errors.serviceId?.message}
            {...register('serviceId')}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="pkg-quantity"
          label="Quantidade de unidades"
          type="number"
          min="2"
          error={errors.quantity?.message}
          {...register('quantity', { valueAsNumber: true })}
        />
        <Input
          id="pkg-price"
          label="Preço do pacote (R$)"
          placeholder="R$ 0,00"
          mask="currency"
          defaultValue={pkg?.price}
          error={errors.price?.message}
          {...register('price')}
        />
      </div>

      {quantity > 0 && price > 0 && (
        <p className="text-sm text-gray-600 -mt-2">
          {formatCurrency(unitPrice)} por unidade
          {servicePrice > 0 && (
            <>
              {' · '}
              {savings > 0 ? (
                <span className="text-green-600">economia de {savings}% em relação ao avulso ({formatCurrency(servicePrice)})</span>
              ) : savings === 0 ? (
                <span className="text-gray-600">mesmo preço do avulso ({formatCurrency(servicePrice)})</span>
              ) : (
                <span className="text-amber-600">mais caro que o avulso ({formatCurrency(servicePrice)})</span>
              )}
            </>
          )}
        </p>
      )}

      <Input
        id="pkg-name"
        label="Nome do pacote"
        placeholder="Ex: 10× Limpeza"
        error={errors.name?.message}
        {...register('name', { onChange: () => setNameTouched(true) })}
      />

      <Textarea id="pkg-description" label="Descrição" placeholder="Opcional" {...register('description')} />

      {pkg && (
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isActive" className="h-4 w-4 rounded border-gray-300 text-blue-600" {...register('isActive')} />
          <label htmlFor="isActive" className="text-sm text-gray-700">Pacote ativo (disponível para venda)</label>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto">
          {pkg ? 'Salvar Alterações' : 'Cadastrar Pacote'}
        </Button>
      </div>
    </form>
  )
}
