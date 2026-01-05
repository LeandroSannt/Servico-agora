'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSession } from 'next-auth/react'
import { Button, Input, Textarea, Select, Checkbox, Modal } from '@/components/ui'
import { serviceOrderSchema, type ServiceOrderFormData, clientSchema, type ClientFormData } from '@/lib/validations'
import { useCreateOrder, useUpdateOrder, useClients, useServices, useCreateClient } from '@/hooks/api'
import { useState, useEffect } from 'react'
import { Plus, Trash2, X, UserPlus, Store } from 'lucide-react'

interface OrderFormProps {
  order?: {
    id: string
    orderNumber: string
    description: string | null
    status: string
    totalAmount: number
    client: { id: string; name: string }
    store: { id: string; name: string }
    services: {
      id: string
      serviceName: string
      description: string | null
      price: number
      quantity: number
    }[]
  } | null
  onSuccess: () => void
  onCancel: () => void
}

export default function OrderForm({ order, onSuccess, onCancel }: OrderFormProps) {
  const { data: session } = useSession()
  const userStore = session?.user?.store

  const createMutation = useCreateOrder()
  const updateMutation = useUpdateOrder()
  const createClientMutation = useCreateClient()

  const isLoading = createMutation.isPending || updateMutation.isPending

  const [showNewService, setShowNewService] = useState<number | null>(null)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [newClientError, setNewClientError] = useState<string | null>(null)

  // Usar a loja do usuário logado ou da ordem existente
  const storeId = order?.store?.id || userStore?.id || ''
  const storeName = order?.store?.name || userStore?.name || ''

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
    setError,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<ServiceOrderFormData>({
    resolver: zodResolver(serviceOrderSchema) as any,
    defaultValues: {
      description: order?.description || '',
      storeId: storeId,
      clientId: order?.client?.id || '',
      services: order?.services?.map((s) => ({
        serviceId: '',
        serviceName: s.serviceName,
        description: s.description || '',
        price: s.price,
        quantity: s.quantity,
        saveGlobally: false,
        isExisting: true, // Marcar como serviço existente na OS
      })) || [
        { serviceId: '', serviceName: '', description: '', price: 0, quantity: 1, saveGlobally: false, isExisting: false },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'services',
  })

  const watchedServices = watch('services')

  // Fetch clients and services using React Query (usando storeId do usuário)
  const { data: clientsData } = useClients({ storeId: storeId, limit: 100 })
  const clients = clientsData?.data || []

  const { data: servicesData } = useServices({ storeId: storeId, limit: 100 })
  const services = servicesData?.data || []

  // New client form
  const {
    register: registerClient,
    handleSubmit: handleSubmitClient,
    formState: { errors: clientErrors },
    reset: resetClientForm,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      document: '',
      storeId: storeId,
    },
  })

  const handleCreateClient = async (data: ClientFormData) => {
    try {
      setNewClientError(null)
      const newClient = await createClientMutation.mutateAsync(data)
      // Selecionar o novo cliente automaticamente
      setValue('clientId', newClient.id)
      setShowNewClientModal(false)
      resetClientForm()
    } catch (error) {
      const axiosError = error as { response?: { data?: { error?: string } } } | null
      setNewClientError(axiosError?.response?.data?.error || 'Erro ao criar cliente')
    }
  }

  // Handle mutation errors
  useEffect(() => {
    if (createMutation.error || updateMutation.error) {
      const error = createMutation.error || updateMutation.error
      const axiosError = error as { response?: { data?: { error?: string } } } | null
      setError('root', {
        message: axiosError?.response?.data?.error || 'Erro ao salvar ordem de serviço',
      })
    }
  }, [createMutation.error, updateMutation.error, setError])

  const handleServiceSelect = (index: number, serviceId: string) => {
    if (serviceId === 'new') {
      setShowNewService(index)
      setValue(`services.${index}.serviceId`, '')
      setValue(`services.${index}.serviceName`, '')
      setValue(`services.${index}.description`, '')
      setValue(`services.${index}.price`, 0)
    } else if (serviceId) {
      const service = services.find((s) => s.id === serviceId)
      if (service) {
        setValue(`services.${index}.serviceId`, serviceId)
        setValue(`services.${index}.serviceName`, service.name)
        setValue(`services.${index}.description`, service.description || '')
        setValue(`services.${index}.price`, service.price)
        setShowNewService(null)
      }
    }
  }

  const calculateTotal = () => {
    return watchedServices?.reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0) || 0
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const onSubmit = async (data: ServiceOrderFormData) => {
    try {
      // Garantir que price e quantity são números
      const normalizedData = {
        ...data,
        services: data.services.map((service) => ({
          ...service,
          price: Number(service.price) || 0,
          quantity: Number(service.quantity) || 1,
        })),
      }

      if (order) {
        await updateMutation.mutateAsync({ id: order.id, data: normalizedData })
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

      {/* Store Info and Client Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Loja (somente leitura) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Loja</label>
          <div className="flex items-center gap-2 h-10 px-3 bg-gray-100 border border-gray-300 rounded-lg">
            <Store className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-900">{storeName || 'Nenhuma loja vinculada'}</span>
          </div>
          <input type="hidden" value={storeId} {...register('storeId')} />
          {errors.storeId?.message && (
            <p className="mt-1.5 text-xs text-red-600">{errors.storeId.message}</p>
          )}
        </div>

        {/* Cliente */}
        <div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                label="Cliente"
                options={clients.map((c) => ({ value: c.id, label: `${c.name} - ${c.phone}` }))}
                placeholder="Selecione o cliente"
                error={errors.clientId?.message}
                disabled={!storeId || !!order}
                {...register('clientId')}
              />
            </div>
            {!order && storeId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewClientModal(true)}
                className="h-10 px-3"
                title="Novo Cliente"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <Textarea
        label="Descrição da OS"
        placeholder="Descreva o problema ou solicitação do cliente..."
        error={errors.description?.message}
        {...register('description')}
      />

      {/* Services */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-gray-700">Serviços</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                serviceId: '',
                serviceName: '',
                description: '',
                price: 0,
                quantity: 1,
                saveGlobally: false,
                isExisting: false, // Novo serviço adicionado durante edição
              })
            }
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Serviço
          </Button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="p-4 border rounded-lg bg-gray-50 space-y-4"
            >
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-gray-500">
                  Serviço #{index + 1}
                </span>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-700 -mt-1 -mr-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Service Selection or New Service Form */}
              {showNewService !== index && !watchedServices[index]?.serviceName ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Select
                      label="Selecionar Serviço"
                      options={[
                        { value: '', label: 'Escolha um serviço' },
                        ...services.map((s) => ({
                          value: s.id,
                          label: `${s.name} - ${formatCurrency(s.price)}`,
                        })),
                        { value: 'new', label: '+ Cadastrar novo serviço' },
                      ]}
                      onChange={(e) => handleServiceSelect(index, e.target.value)}
                      error={errors.services?.[index]?.serviceName?.message}
                    />
                  </div>
                  <Input
                    label="Quantidade"
                    type="number"
                    min="1"
                    {...register(`services.${index}.quantity` as const, { valueAsNumber: true })}
                  />
                </div>
              ) : showNewService === index ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-600 font-medium">
                      Novo Serviço
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewService(null)}
                      className="text-gray-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nome do Serviço"
                      placeholder="Ex: Reparo específico"
                      error={errors.services?.[index]?.serviceName?.message}
                      {...register(`services.${index}.serviceName`)}
                    />
                    <Input
                      label="Preço (R$)"
                      type="number"
                      step="0.01"
                      min="0"
                      error={errors.services?.[index]?.price?.message}
                      {...register(`services.${index}.price` as const, { valueAsNumber: true })}
                    />
                  </div>
                  <Textarea
                    label="Descrição"
                    placeholder="Descreva o serviço..."
                    {...register(`services.${index}.description`)}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Quantidade"
                      type="number"
                      min="1"
                      {...register(`services.${index}.quantity` as const, { valueAsNumber: true })}
                    />
                    <div className="flex items-end pb-2">
                      <Checkbox
                        label="Salvar serviço globalmente"
                        {...register(`services.${index}.saveGlobally`)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Existing service - show details with edit capability */
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 font-medium">
                      Serviço Existente
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewService(index)}
                      className="text-blue-600"
                    >
                      Editar
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                    <strong>{watchedServices[index].serviceName}</strong>
                    {watchedServices[index].description && (
                      <p className="mt-1">{watchedServices[index].description}</p>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-green-600 font-semibold">
                        {formatCurrency(watchedServices[index].price)} x{' '}
                        {watchedServices[index].quantity} ={' '}
                        {formatCurrency(
                          watchedServices[index].price * watchedServices[index].quantity
                        )}
                      </p>
                      <Input
                        type="number"
                        min="1"
                        className="w-20"
                        {...register(`services.${index}.quantity` as const, { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {errors.services?.message && (
          <p className="text-sm text-red-600 mt-2">{errors.services.message}</p>
        )}
      </div>

      {/* Total */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Total:</span>
          <span className="text-green-600">{formatCurrency(calculateTotal())}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto">
          {order ? 'Salvar Alterações' : 'Criar Ordem de Serviço'}
        </Button>
      </div>

      {/* Modal Novo Cliente */}
      <Modal
        isOpen={showNewClientModal}
        onClose={() => {
          setShowNewClientModal(false)
          setNewClientError(null)
          resetClientForm()
        }}
        title="Novo Cliente"
        size="md"
      >
        <form onSubmit={handleSubmitClient(handleCreateClient)} className="space-y-4">
          {newClientError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {newClientError}
            </div>
          )}

          <input type="hidden" value={storeId} {...registerClient('storeId')} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome *"
              placeholder="Nome completo"
              error={clientErrors.name?.message}
              {...registerClient('name')}
            />
            <Input
              label="Telefone *"
              placeholder="(00) 00000-0000"
              error={clientErrors.phone?.message}
              {...registerClient('phone')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="email@exemplo.com"
              {...registerClient('email')}
            />
            <Input
              label="CPF/CNPJ"
              placeholder="000.000.000-00"
              {...registerClient('document')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNewClientModal(false)
                setNewClientError(null)
                resetClientForm()
              }}
              disabled={createClientMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={createClientMutation.isPending}>
              <UserPlus className="h-4 w-4 mr-2" />
              Criar Cliente
            </Button>
          </div>
        </form>
      </Modal>
    </form>
  )
}
