'use client'

import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
} from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input, Select, Checkbox } from '@/components/ui'
import { useProducts } from '@/hooks/api'
import type { ServiceOrderFormData } from '@/lib/validations'

interface Props {
  control: Control<ServiceOrderFormData>
  register: UseFormRegister<ServiceOrderFormData>
  errors: FieldErrors<ServiceOrderFormData>
  storeId: string
  watch: UseFormWatch<ServiceOrderFormData>
  setValue: UseFormSetValue<ServiceOrderFormData>
}

/** Produtos da OS: do catálogo da loja ou avulsos. O total é calculado pelo OrderForm. */
export default function OrderProductsSection({ control, register, errors, storeId, watch, setValue }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: 'products' })
  const { data: catalogData, isLoading: catalogLoading } = useProducts({ storeId: storeId || undefined, active: true, limit: 100 })
  const catalog = storeId ? catalogData?.data ?? [] : []
  const watched = watch('products')

  return (
    <div className="border-t pt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-700">Produtos</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ name: '', quantity: 1, unitPrice: 0, saveToCatalog: false })}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Produto
        </Button>
      </div>

      {!storeId ? (
        <p className="mb-3 text-xs text-gray-500">Selecione a loja para escolher produtos cadastrados.</p>
      ) : !catalogLoading && catalog.length === 0 ? (
        <p className="mb-3 text-xs text-gray-500">
          Nenhum produto cadastrado nesta loja. Cadastre em Produtos ou marque &quot;Salvar no catálogo&quot; ao digitar um.
        </p>
      ) : null}

      {fields.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum produto. Use para itens vendidos junto com a OS.</p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg bg-gray-50">
              {catalog.length > 0 && (
                <div className="col-span-12">
                  <Select
                    label="Produto cadastrado"
                    value={watched?.[index]?.productId ?? ''}
                    options={[
                      { value: '', label: 'Avulso (digitar manualmente)' },
                      ...catalog.map((p) => ({
                        value: p.id,
                        label: `${p.name} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(p.price))}`,
                      })),
                    ]}
                    onChange={(e) => {
                      const p = catalog.find((c) => c.id === e.target.value)
                      if (p) {
                        setValue(`products.${index}.productId`, p.id, { shouldDirty: true })
                        setValue(`products.${index}.name`, p.name, { shouldDirty: true })
                        setValue(`products.${index}.unitPrice`, Number(p.price), { shouldDirty: true })
                        setValue(`products.${index}.saveToCatalog`, false, { shouldDirty: true })
                      } else {
                        setValue(`products.${index}.productId`, undefined, { shouldDirty: true })
                      }
                    }}
                  />
                </div>
              )}
              <div className="col-span-12 sm:col-span-6">
                <Input
                  label="Produto"
                  placeholder="Ex.: Corrente de bicicleta"
                  error={errors.products?.[index]?.name?.message}
                  {...register(`products.${index}.name` as const)}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Input
                  label="Qtd"
                  type="number"
                  min="1"
                  error={errors.products?.[index]?.quantity?.message}
                  {...register(`products.${index}.quantity` as const, { valueAsNumber: true })}
                />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <Input
                  label="Preço unit. (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  error={errors.products?.[index]?.unitPrice?.message}
                  {...register(`products.${index}.unitPrice` as const, { valueAsNumber: true })}
                />
              </div>
              {!watched?.[index]?.productId && (
                <div className="col-span-12">
                  <Checkbox
                    id={`products-${index}-save`}
                    label="Salvar no catálogo"
                    {...register(`products.${index}.saveToCatalog` as const)}
                  />
                </div>
              )}
              <div className="col-span-2 sm:col-span-1 flex justify-end pt-7">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-red-600 hover:text-red-700"
                  aria-label="Remover produto"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
