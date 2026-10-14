'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Textarea, Select } from '@/components/ui'
import { productSchema, type ProductFormData } from '@/lib/validations'
import { useCreateProduct, useUpdateProduct, useStores } from '@/hooks/api'
import { useEffect } from 'react'

interface ProductFormProps {
  product?: {
    id: string
    name: string
    description: string | null
    price: number | string
    isActive: boolean
    store: { id: string; name: string }
  } | null
  onSuccess: () => void
  onCancel: () => void
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()

  const isLoading = createMutation.isPending || updateMutation.isPending

  const { data: storesData } = useStores({ limit: 100 })
  const stores = storesData?.data || []

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ProductFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      price: Number(product?.price) || 0,
      isActive: product?.isActive ?? true,
      storeId: product?.store?.id || '',
    },
  })

  // Handle mutation errors
  useEffect(() => {
    if (createMutation.error || updateMutation.error) {
      const error = createMutation.error || updateMutation.error
      const axiosError = error as { response?: { data?: { error?: string } } } | null
      setError('root', {
        message: axiosError?.response?.data?.error || 'Erro ao salvar produto',
      })
    }
  }, [createMutation.error, updateMutation.error, setError])

  const onSubmit = async (data: ProductFormData) => {
    try {
      // Garantir que price é número (pode vir como string do input com máscara)
      const normalizedData = {
        ...data,
        price: typeof data.price === 'string' ? parseFloat(data.price) || 0 : data.price,
      }

      if (product) {
        await updateMutation.mutateAsync({ id: product.id, data: normalizedData })
      } else {
        await createMutation.mutateAsync(normalizedData)
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

      <Input
        label="Nome do Produto"
        placeholder="Ex: Cabo USB"
        error={errors.name?.message}
        {...register('name')}
      />

      <Textarea
        label="Descrição"
        placeholder="Descreva o produto..."
        {...register('description')}
      />

      <Input
        label="Preço (R$)"
        placeholder="R$ 0,00"
        mask="currency"
        error={errors.price?.message}
        {...register('price')}
      />

      {product && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            {...register('isActive')}
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">
            Produto ativo
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto">
          {product ? 'Salvar Alterações' : 'Cadastrar Produto'}
        </Button>
      </div>
    </form>
  )
}
