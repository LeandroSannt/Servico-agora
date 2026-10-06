'use client'

import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSession } from 'next-auth/react'
import { Button, Input, Textarea, Select, Checkbox, Modal } from '@/components/ui'
import { serviceOrderSchema, type ServiceOrderFormData, clientSchema, type ClientFormData } from '@/lib/validations'
import {
  useCreateOrder,
  useUpdateOrder,
  useClients,
  useServices,
  useCreateClient,
  useStores,
  useClientPackages,
  useClientEquipments,
} from '@/hooks/api'
import EquipmentPicker from '@/components/orders/EquipmentPicker'
import OrderProductsSection from '@/components/orders/OrderProductsSection'
import { regroupOrderItems, catalogPriceFromItems } from '@/lib/packages/regroup'
import {
  buildBalanceByService,
  computeEffectiveUse,
  availableBefore,
  syncUseWithQuantity,
} from '@/lib/packages/form-balance'
import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Trash2, X, UserPlus, Store, Package } from 'lucide-react'

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
      serviceId: string | null
      serviceName: string
      description: string | null
      price: number
      quantity: number
      packageUsage?: { quantity: number; clientPackage: { id: string; name: string } } | null
      service?: { price: number | string } | null
      equipments?: { equipment: { id: string; name: string; isActive: boolean } }[]
    }[]
    products?: { id: string; name: string; quantity: number; unitPrice: number | string }[]
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

  // Loja fixa quando editando ou quando o usuário tem loja vinculada;
  // caso contrário o usuário escolhe a loja num select.
  const isStoreReadOnly = !!order || !!userStore
  const initialStoreId = order?.store?.id || userStore?.id || ''
  const storeName = order?.store?.name || userStore?.name || ''

  const emptyServiceItem = {
    serviceId: '',
    serviceName: '',
    description: '',
    price: 0,
    quantity: 1,
    saveGlobally: false,
    isExisting: false,
    usePackageQuantity: 0,
    equipmentIds: [] as string[],
  }

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    getValues,
    setValue,
    setError,
  } = useForm<ServiceOrderFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(serviceOrderSchema) as any,
    defaultValues: {
      description: order?.description || '',
      storeId: initialStoreId,
      clientId: order?.client?.id || '',
      // Itens vindos de pacote são reagrupados com o irmão cobrado; itens 100% cobertos (gravados
      // a R$ 0) recebem o preço atual do serviço vinculado, que a API inclui em cada item
      services: order?.services
        ? regroupOrderItems(order.services, catalogPriceFromItems(order.services))
        : [emptyServiceItem],
      products: (order?.products ?? []).map((p) => ({ name: p.name, quantity: p.quantity, unitPrice: Number(p.unitPrice) })),
    },
  })

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'services',
  })

  const watchedServices = watch('services')
  const storeId = watch('storeId')
  const clientId = watch('clientId')
  const watchedProducts = watch('products')
  // Na edição também os arquivados: os já vinculados continuam selecionáveis (marcados "arquivado")
  const { data: clientEquipments = [], isLoading: equipmentsLoading } = useClientEquipments(clientId, {
    includeArchived: !!order,
  })
  const {
    data: clientPackages,
    refetch: refetchBalances,
    isError: balancesError,
  } = useClientPackages(clientId)

  // Sem os saldos carregados, o uso efetivo seria 0 e salvar recriaria itens cobertos como cobrados
  const balancesReady = !clientId || !!clientPackages

  // Saldo por serviço; na edição, os consumos da própria OS voltam a contar como disponíveis
  const balanceByService = useMemo(
    () => buildBalanceByService(clientPackages?.balances, clientPackages?.packages, order?.id),
    [clientPackages, order?.id]
  )

  // Uso efetivo por item. Sem useMemo de propósito: watch('services') devolve o mesmo array
  // (mutado no lugar) após setValue em campos aninhados, então a memo ficaria desatualizada.
  const effectiveUse = computeEffectiveUse(watchedServices ?? [], balanceByService)

  const anyItemUsesPackage = (watchedServices ?? []).some((s) => (Number(s.usePackageQuantity) || 0) > 0)
  // Carregando: bloqueia sempre. Erro: só bloqueia se alguma linha usa pacote (as demais OS salvam)
  const submitBlockedByBalances = !balancesReady && (!balancesError || anyItemUsesPackage)

  // Linhas (por fields[i].id) em que o usuário marcou/desmarcou "Usar pacote" manualmente, e linhas
  // cujo serviço do catálogo foi escolhido antes de os saldos chegarem (recebem o padrão depois)
  const toggledLineKeys = useRef(new Set<string>())
  const pendingDefaultLineKeys = useRef(new Set<string>())

  /** Saldo disponível para a linha, descontando o uso efetivo das linhas anteriores do mesmo serviço. */
  const availableForLine = (index: number) => {
    const items = getValues('services') ?? []
    return availableBefore(items, computeEffectiveUse(items, balanceByService), index, balanceByService)
  }

  // Mantém o uso de pacote em sincronia com a quantidade (só se o item já usa pacote)
  const syncPackageUseWithQuantity = (index: number, rawQuantity: string) => {
    const newQuantity = Number(rawQuantity)
    if (!Number.isInteger(newQuantity) || newQuantity < 1) return
    const current = Number(getValues(`services.${index}.usePackageQuantity`)) || 0
    const next = syncUseWithQuantity(current, newQuantity, availableForLine(index))
    if (next !== current) setValue(`services.${index}.usePackageQuantity`, next)
  }

  const quantityRegisterOptions = (index: number) => ({
    valueAsNumber: true as const,
    onChange: (e: { target: { value: string } }) => syncPackageUseWithQuantity(index, e.target.value),
  })

  // Saldos e equipamentos pertencem ao cliente anterior: desmarca o uso de pacote e os
  // equipamentos de todos os itens
  const resetPackageUse = () => {
    const items = getValues('services') ?? []
    items.forEach((_, i) => setValue(`services.${i}.usePackageQuantity`, 0))
    toggledLineKeys.current.clear()
    pendingDefaultLineKeys.current.clear()
    items.forEach((_, i) => setValue(`services.${i}.equipmentIds`, []))
  }

  // Serviço do catálogo escolhido antes de os saldos chegarem: aplica o padrão uma vez quando
  // chegam, só nas linhas ainda em 0 que o usuário não marcou/desmarcou
  useEffect(() => {
    if (!balancesReady || pendingDefaultLineKeys.current.size === 0) return
    const items = getValues('services') ?? []
    const use = computeEffectiveUse(items, balanceByService)
    fields.forEach((field, i) => {
      if (!pendingDefaultLineKeys.current.has(field.id)) return
      const item = items[i]
      if (!item?.serviceId || toggledLineKeys.current.has(field.id)) return
      if ((Number(item.usePackageQuantity) || 0) > 0) return
      const defaultUse = Math.min(
        Number(item.quantity) || 1,
        availableBefore(items, use, i, balanceByService)
      )
      if (defaultUse > 0) {
        setValue(`services.${i}.usePackageQuantity`, defaultUse)
        use[i] = defaultUse
      }
    })
    pendingDefaultLineKeys.current.clear()
  }, [balancesReady, balanceByService, fields, getValues, setValue])

  // Lojas disponíveis (só usadas no modo com select; requisição leve, aceita)
  const { data: storesData } = useStores({ limit: 100 })
  const stores = storesData?.data || []

  // Fetch clients and services using React Query (filtrados pela loja do form)
  const { data: clientsData, isSuccess: clientsLoaded } = useClients({ storeId: storeId, limit: 100 })
  const clients = clientsData?.data || []

  const { data: servicesData } = useServices({ storeId: storeId, limit: 100 })
  const services = servicesData?.data || []

  // Nome com que cada serviço vinculado entrou no formulário (carregado da OS ou escolhido no
  // catálogo); só serve de referência quando o serviço não está na lista do catálogo (limit 100)
  const linkedServiceNames = useRef(
    new Map<string, string>(
      (order?.services ?? []).flatMap((s): [string, string][] =>
        s.serviceId ? [[s.serviceId, s.serviceName]] : []
      )
    )
  )

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
      storeId: initialStoreId,
    },
  })

  const openNewClientModal = () => {
    // O sub-form captura storeId só na montagem; injeta a loja atual ao abrir.
    resetClientForm({ name: '', phone: '', email: '', document: '', storeId })
    setNewClientError(null)
    setShowNewClientModal(true)
  }

  const handleCreateClient = async (data: ClientFormData) => {
    try {
      setNewClientError(null)
      const newClient = await createClientMutation.mutateAsync(data)
      // Selecionar o novo cliente automaticamente
      setValue('clientId', newClient.id)
      resetPackageUse()
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
      const axiosError = error as {
        response?: {
          status?: number
          data?: { error?: string; remaining?: number; serviceId?: string }
        }
      } | null
      if (axiosError?.response?.status === 409) {
        // Saldo de pacote mudou (ou conflito de concorrência): recarrega os saldos
        refetchBalances()
        const data = axiosError.response.data
        const remaining = data?.remaining
        const serviceName = data?.serviceId
          ? (getValues('services') ?? []).find((s) => s.serviceId === data.serviceId)?.serviceName
          : undefined
        const packageLabel = serviceName ? `Saldo do pacote de "${serviceName}"` : 'Saldo do pacote'
        setError('root', {
          message:
            remaining !== undefined
              ? `${packageLabel} mudou: restam ${remaining}. O restante será cobrado; revise e salve de novo.`
              : data?.error || 'Conflito ao salvar a OS; tente novamente',
        })
      } else {
        setError('root', {
          message: axiosError?.response?.data?.error || 'Erro ao salvar ordem de serviço',
        })
      }
    }
  }, [createMutation.error, updateMutation.error, setError, refetchBalances, getValues])

  const handleServiceSelect = (index: number, serviceId: string) => {
    if (serviceId === 'new') {
      setShowNewService(index)
      setValue(`services.${index}.serviceId`, '')
      setValue(`services.${index}.serviceName`, '')
      setValue(`services.${index}.description`, '')
      setValue(`services.${index}.price`, 0)
      setValue(`services.${index}.usePackageQuantity`, 0)
    } else if (serviceId) {
      const service = services.find((s) => s.id === serviceId)
      if (service) {
        setValue(`services.${index}.serviceId`, serviceId)
        linkedServiceNames.current.set(serviceId, service.name)
        setValue(`services.${index}.serviceName`, service.name)
        setValue(`services.${index}.description`, service.description || '')
        setValue(`services.${index}.price`, Number(service.price))
        // Com saldo, o pacote é usado por padrão (descontando linhas anteriores do mesmo serviço);
        // se os saldos ainda não chegaram, o padrão é aplicado quando chegarem
        const lineKey = fields[index]?.id
        if (lineKey) toggledLineKeys.current.delete(lineKey)
        const quantity = Number(getValues(`services.${index}.quantity`)) || 1
        setValue(`services.${index}.usePackageQuantity`, Math.min(quantity, availableForLine(index)))
        if (!balancesReady && lineKey) pendingDefaultLineKeys.current.add(lineKey)
        setShowNewService(null)
      }
    }
  }

  const servicesTotal = () =>
    watchedServices?.reduce((sum, s, i) => {
      const charged = Math.max(0, (Number(s.quantity) || 1) - (effectiveUse[i] ?? 0))
      return sum + (Number(s.price) || 0) * charged
    }, 0) || 0

  const productsTotal = () =>
    (watchedProducts ?? []).reduce((sum, p) => sum + (Number(p.unitPrice) || 0) * (Number(p.quantity) || 0), 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const onSubmit = async (data: ServiceOrderFormData) => {
    if (submitBlockedByBalances) {
      // O botão já fica desabilitado; guarda extra para não gravar itens cobertos como cobrados
      setError('root', {
        message: balancesError
          ? 'Não foi possível carregar o saldo de pacotes. Tente novamente.'
          : 'Aguarde o carregamento do saldo de pacotes antes de salvar.',
      })
      return
    }
    try {
      // Garantir que price e quantity são números; o uso de pacote enviado nunca passa do saldo
      const submitUse = computeEffectiveUse(data.services, balanceByService)
      const normalizedData = {
        ...data,
        services: data.services.map((service, index) => ({
          ...service,
          price: Number(service.price) || 0,
          quantity: Number(service.quantity) || 1,
          usePackageQuantity: submitUse[index],
        })),
        products: (data.products ?? []).map((p) => ({
          name: p.name,
          quantity: Number(p.quantity) || 1,
          unitPrice: Number(p.unitPrice) || 0,
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

      {clientId && balancesError && !clientPackages && (
        <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <span className="text-amber-800">Não foi possível carregar o saldo de pacotes. Tente novamente.</span>
          <button
            type="button"
            onClick={() => refetchBalances()}
            className="shrink-0 font-medium text-amber-900 underline hover:text-amber-700"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Store Info and Client Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Loja: somente leitura (editando ou usuário com loja) ou select */}
        {isStoreReadOnly ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Loja</label>
            <div className="flex items-center gap-2 h-10 px-3 bg-gray-100 border border-gray-300 rounded-lg">
              <Store className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-900">{storeName || 'Nenhuma loja vinculada'}</span>
            </div>
            <input type="hidden" value={initialStoreId} {...register('storeId')} />
            {errors.storeId?.message && (
              <p className="mt-1.5 text-xs text-red-600">{errors.storeId.message}</p>
            )}
          </div>
        ) : (
          <Select
            label="Loja"
            options={stores.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Selecione a loja"
            error={errors.storeId?.message}
            {...register('storeId', {
              onChange: () => {
                // Clientes e serviços pertencem à loja anterior
                setValue('clientId', '')
                replace([emptyServiceItem])
                setShowNewService(null)
              },
            })}
          />
        )}

        {/* Cliente */}
        <div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                label="Cliente"
                options={clients.map((c) => ({ value: c.id, label: `${c.name} - ${c.phone}` }))}
                placeholder={storeId ? 'Selecione o cliente' : 'Selecione a loja primeiro'}
                error={errors.clientId?.message}
                disabled={!storeId || !!order}
                {...register('clientId', { onChange: resetPackageUse })}
              />
            </div>
            {!order && storeId && (
              <Button
                type="button"
                variant="outline"
                onClick={openNewClientModal}
                className="h-10 px-3"
                title="Novo Cliente"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            )}
          </div>
          {!order && storeId && clientsLoaded && clients.length === 0 && (
            <p className="mt-1.5 text-xs text-gray-500">
              Nenhum cliente nesta loja.{' '}
              <button
                type="button"
                onClick={openNewClientModal}
                className="font-medium text-blue-600 hover:text-blue-700 underline"
              >
                Cadastrar novo cliente
              </button>
            </p>
          )}
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
                usePackageQuantity: 0,
                equipmentIds: [],
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
                {(fields.length > 1 || (watchedProducts?.length ?? 0) > 0) && (
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
                    {...register(`services.${index}.quantity` as const, quantityRegisterOptions(index))}
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
                      {...register(`services.${index}.serviceName`, {
                        onChange: (e) => {
                          // Só deixa de ser o serviço do catálogo (e de usar pacote) se o nome realmente
                          // mudou; compara sem espaços nas pontas e sem diferenciar maiúsculas
                          const linkedId = getValues(`services.${index}.serviceId`)
                          if (!linkedId) return
                          const catalogName =
                            services.find((s) => s.id === linkedId)?.name ??
                            linkedServiceNames.current.get(linkedId)
                          const typed = String(e.target.value ?? '').trim().toLowerCase()
                          if (catalogName !== undefined && typed === catalogName.trim().toLowerCase()) return
                          setValue(`services.${index}.serviceId`, '')
                          setValue(`services.${index}.usePackageQuantity`, 0)
                        },
                      })}
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
                      {...register(`services.${index}.quantity` as const, quantityRegisterOptions(index))}
                    />
                    <div className="flex items-end pb-2">
                      <Checkbox
                        label="Salvar serviço globalmente"
                        {...register(`services.${index}.saveGlobally`)}
                      />
                    </div>
                  </div>
                  {(Number(watchedServices[index]?.usePackageQuantity) || 0) > 0 && (
                    <p className="flex items-center gap-1.5 text-sm text-blue-700">
                      <Package className="w-4 h-4 text-blue-600" />
                      Usa pacote:{' '}
                      {balancesReady
                        ? effectiveUse[index] ?? 0
                        : Number(watchedServices[index]?.usePackageQuantity) || 0}{' '}
                      un
                    </p>
                  )}
                </div>
              ) : (() => {
                /* Existing service - show details with edit capability */
                const item = watchedServices[index]
                const itemServiceId = item.serviceId || ''
                const qty = Number(item.quantity) || 1
                const price = Number(item.price) || 0
                const requested = Number(item.usePackageQuantity) || 0
                const use = effectiveUse[index] ?? 0
                const charged = Math.max(0, qty - use)
                // Saldo que sobra para esta linha depois das linhas anteriores do mesmo serviço
                const balance = availableBefore(watchedServices ?? [], effectiveUse, index, balanceByService)
                return (
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
                        {formatCurrency(price)} x {charged} = {formatCurrency(price * charged)}
                      </p>
                      <Input
                        type="number"
                        min="1"
                        className="w-20"
                        {...register(`services.${index}.quantity` as const, quantityRegisterOptions(index))}
                      />
                    </div>
                  </div>
                  {itemServiceId && (balance > 0 || requested > 0) && (
                    <div className="flex flex-col gap-1 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          checked={requested > 0}
                          onChange={(e) => {
                            toggledLineKeys.current.add(field.id)
                            pendingDefaultLineKeys.current.delete(field.id)
                            setValue(
                              `services.${index}.usePackageQuantity`,
                              e.target.checked ? Math.min(qty, balance) || qty : 0
                            )
                          }}
                        />
                        <Package className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-800">Usar pacote</span>
                        {balancesReady && (
                          <span className="text-blue-700">· cliente tem {balance} no pacote</span>
                        )}
                      </label>
                      {!balancesReady ? (
                        <p className="text-gray-600 pl-6">
                          {balancesError ? 'Saldo indisponível.' : 'Carregando saldo…'}
                        </p>
                      ) : requested > 0 && use === 0 ? (
                        <p className="text-amber-700 pl-6">Sem saldo disponível; será cobrado normalmente.</p>
                      ) : (
                        requested > 0 &&
                        use < qty && (
                          <p className="text-blue-700 pl-6">
                            {use} pelo pacote · {qty - use} cobrado a {formatCurrency(price)}
                          </p>
                        )
                      )}
                    </div>
                  )}
                </div>
                )
              })()}
              <Controller
                control={control}
                name={`services.${index}.equipmentIds`}
                render={({ field: f }) => (
                  <EquipmentPicker
                    equipments={clientEquipments}
                    value={f.value ?? []}
                    onChange={f.onChange}
                    hasClient={!!clientId}
                    loading={equipmentsLoading}
                  />
                )}
              />
            </div>
          ))}
        </div>

        {(errors.services?.message || errors.services?.root?.message) && (
          <p className="text-sm text-red-600 mt-2">{errors.services?.message || errors.services?.root?.message}</p>
        )}
      </div>

      <OrderProductsSection control={control} register={register} errors={errors} />

      {/* Total */}
      <div className="border-t pt-4 space-y-1">
        {(watchedProducts?.length ?? 0) > 0 && (
          <>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Serviços</span>
              <span>{formatCurrency(servicesTotal())}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Produtos</span>
              <span>{formatCurrency(productsTotal())}</span>
            </div>
          </>
        )}
        <div className="flex justify-between items-center text-lg font-bold">
          <span className="text-gray-900">Total:</span>
          <span className="text-green-600">{formatCurrency(servicesTotal() + productsTotal())}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={submitBlockedByBalances}
          className="w-full sm:w-auto"
        >
          {submitBlockedByBalances && !balancesError
            ? 'Carregando saldo de pacotes…'
            : order
              ? 'Salvar Alterações'
              : 'Criar Ordem de Serviço'}
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
        <form
          onSubmit={(e) => {
            // O modal fica dentro do <form> da OS; sem isso o submit propaga
            // pela árvore do React e dispara a validação da OS também.
            e.stopPropagation()
            handleSubmitClient(handleCreateClient)(e)
          }}
          className="space-y-4"
        >
          {newClientError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {newClientError}
            </div>
          )}

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
