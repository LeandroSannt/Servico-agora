'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Plus, Edit2, Trash2, ClipboardList, Play, CheckCircle, ArrowRight, Calendar, X, DollarSign, Inbox, Pause, Wrench } from 'lucide-react'
import { Button, Input, Modal, Badge, EmptyState, Select, Textarea, Pagination } from '@/components/ui'
import { usePageState, useClampPage } from '@/hooks/use-pagination'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import OrderForm from '@/components/forms/OrderForm'
import { useOrders, useDeleteOrder, useUpdateOrderStatus } from '@/hooks/api'
import ScopeFilter, { type ScopeValue } from '@/components/layout/ScopeFilter'
import { orderEquipmentNames, summarizeNames } from '@/lib/equipments/order-equipments'

interface OrderService {
  id: string
  serviceId: string | null
  serviceName: string
  description: string | null
  price: number
  quantity: number
  packageUsage?: { quantity: number; clientPackage: { id: string; name: string } } | null
  service?: { price: number | string } | null
  equipments?: { equipment: { id: string; name: string; isActive: boolean } }[]
}

interface Order {
  id: string
  orderNumber: string
  description: string | null
  status: 'RECEIVED' | 'IN_PROGRESS' | 'PAUSED' | 'FINISHED' | 'PAID'
  totalAmount: number
  client: { id: string; name: string; phone: string; email: string | null }
  store: { id: string; name: string }
  services: OrderService[]
  products?: { id: string; name: string; quantity: number; unitPrice: number | string }[]
  createdAt: string
  updatedAt: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'RECEIVED', label: 'Recebido' },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'PAUSED', label: 'Pausado' },
  { value: 'FINISHED', label: 'Finalizado' },
  { value: 'PAID', label: 'Pago' },
]

const STATUS_CONFIG = {
  RECEIVED: { label: 'Recebido', variant: 'secondary' as const, icon: Inbox },
  IN_PROGRESS: { label: 'Em Andamento', variant: 'info' as const, icon: Play },
  PAUSED: { label: 'Pausado', variant: 'warning' as const, icon: Pause },
  FINISHED: { label: 'Finalizado', variant: 'success' as const, icon: CheckCircle },
  PAID: { label: 'Pago', variant: 'default' as const, icon: DollarSign },
}

const NEXT_STATUS: Record<string, { status: string; label: string } | null> = {
  RECEIVED: { status: 'IN_PROGRESS', label: 'Iniciar' },
  IN_PROGRESS: { status: 'PAUSED', label: 'Pausar' },
  PAUSED: { status: 'FINISHED', label: 'Finalizar' },
  FINISHED: { status: 'PAID', label: 'Pagar' },
  PAID: null,
}

const PERIOD_OPTIONS = [
  { value: '', label: 'Todos os períodos' },
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'week', label: 'Últimos 7 dias' },
  { value: 'month', label: 'Este mês' },
  { value: 'lastMonth', label: 'Mês passado' },
  { value: 'custom', label: 'Personalizado' },
]

function getDateRange(period: string): { startDate?: string; endDate?: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (period) {
    case 'today':
      return { startDate: today.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] }
    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return { startDate: yesterday.toISOString().split('T')[0], endDate: yesterday.toISOString().split('T')[0] }
    }
    case 'week': {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return { startDate: weekAgo.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] }
    }
    case 'month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      return { startDate: firstDay.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] }
    }
    case 'lastMonth': {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      return { startDate: firstDayLastMonth.toISOString().split('T')[0], endDate: lastDayLastMonth.toISOString().split('T')[0] }
    }
    default:
      return {}
  }
}

const PAGE_SIZE = 20

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('search')
    if (q) setSearch(q)
  }, [])
  const [statusFilter, setStatusFilter] = useState('')
  const [scope, setScope] = useState<ScopeValue>({ companyId: '', storeId: '' })
  const [periodFilter, setPeriodFilter] = useState('')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [page, setPage] = usePageState(
    JSON.stringify([search, statusFilter, scope, periodFilter, customStartDate, customEndDate])
  )
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [viewOrder, setViewOrder] = useState<Order | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [statusChangeOrder, setStatusChangeOrder] = useState<Order | null>(null)
  const [pausedReason, setPausedReason] = useState('')

  // Calcular datas baseado no período selecionado
  const dateFilters = useMemo(() => {
    if (periodFilter === 'custom') {
      return { startDate: customStartDate || undefined, endDate: customEndDate || undefined }
    }
    return getDateRange(periodFilter)
  }, [periodFilter, customStartDate, customEndDate])

  const { data: ordersData, isLoading } = useOrders({
    search: search || undefined,
    status: statusFilter || undefined,
    companyId: scope.companyId || undefined,
    storeId: scope.storeId || undefined,
    startDate: dateFilters.startDate,
    endDate: dateFilters.endDate,
    page,
    limit: PAGE_SIZE,
  })
  const deleteMutation = useDeleteOrder()
  const updateStatusMutation = useUpdateOrderStatus()

  const orders = ordersData?.data || []
  const pagination = ordersData?.pagination
  useClampPage(page, pagination?.totalPages, setPage)

  const handleCreate = () => {
    setSelectedOrder(null)
    setIsModalOpen(true)
  }

  const handleEdit = (order: Order) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
  }

  const handleView = (order: Order) => {
    setViewOrder(order)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Erro ao deletar ordem:', error)
      alert('Erro ao deletar ordem')
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string, reason?: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: orderId,
        status: newStatus,
        pausedReason: newStatus === 'PAUSED' ? reason : undefined,
      })
      setStatusChangeOrder(null)
      setPausedReason('')
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status')
    }
  }

  const handleSuccess = () => {
    setIsModalOpen(false)
    setSelectedOrder(null)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const advanceStatus = (order: Order) => {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    if (next.status === 'PAUSED') {
      setStatusChangeOrder(order)
    } else {
      handleStatusChange(order.id, next.status)
    }
  }


  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ordens de Serviço</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-0.5 sm:mt-1">Gerencie as ordens de serviço</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="search"
              placeholder="Buscar por número ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <ScopeFilter value={scope} onChange={setScope} />
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4">
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40"
            />
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Select
                options={PERIOD_OPTIONS}
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="pl-9 w-full sm:w-44"
              />
            </div>
          </div>
          <Button onClick={handleCreate} className="w-full sm:w-auto justify-center">
            <Plus className="h-4 w-4 mr-2" />
            <span className="sm:inline">Nova OS</span>
          </Button>
        </div>

        {/* Filtros de data personalizada */}
        {periodFilter === 'custom' && (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end bg-gray-50 p-3 sm:p-4 rounded-lg">
            <div className="flex-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Data inicial</label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Data final</label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCustomStartDate('')
                setCustomEndDate('')
              }}
              className="text-gray-500 w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          </div>
        )}

        {/* Indicador de filtro ativo */}
        {(periodFilter || statusFilter) && (
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
            <span>Filtros:</span>
            {statusFilter && (
              <Badge variant="default" className="text-xs">
                {STATUS_OPTIONS.find(s => s.value === statusFilter)?.label}
              </Badge>
            )}
            {periodFilter && (
              <Badge variant="default" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {periodFilter === 'custom'
                  ? `${customStartDate || '...'} - ${customEndDate || '...'}`
                  : PERIOD_OPTIONS.find(p => p.value === periodFilter)?.label
                }
              </Badge>
            )}
            <button
              onClick={() => {
                setStatusFilter('')
                setPeriodFilter('')
                setCustomStartDate('')
                setCustomEndDate('')
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10 sm:h-12 sm:w-12" />}
          title="Nenhuma ordem encontrada"
          description="Crie uma nova ordem de serviço"
          action={
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova OS
            </Button>
          }
        />
      ) : (
        <>
          {/* Tabela (todas as larguras): clicar na linha abre o detalhe da OS */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criada em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const statusConfig = STATUS_CONFIG[order.status]
                  const StatusIcon = statusConfig.icon
                  const names = orderEquipmentNames(order.services)
                  return (
                    <TableRow
                      key={order.id}
                      tabIndex={0}
                      onClick={() => handleView(order)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleView(order)
                        }
                      }}
                      title={`Abrir OS #${order.orderNumber}`}
                      className="cursor-pointer hover:bg-blue-50/60 focus:outline-none focus-visible:bg-blue-50"
                    >
                      <TableCell className="whitespace-nowrap">
                        <p className="font-medium text-gray-900">{order.client.name}</p>
                        <p className="text-xs sm:text-sm text-gray-500">{order.client.phone}</p>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <span
                          className={`block truncate ${names.length ? 'text-sm text-gray-800' : 'text-gray-400'}`}
                          title={names.join(', ') || undefined}
                        >
                          {summarizeNames(names)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant} className="whitespace-nowrap">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            totalPages={pagination?.totalPages ?? 1}
            total={pagination?.total ?? 0}
            limit={PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="ordens de serviço"
          />
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedOrder ? `Editar OS #${selectedOrder.orderNumber}` : 'Nova Ordem de Serviço'}
        size="lg"
      >
        <OrderForm
          order={selectedOrder}
          onSuccess={handleSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* View Order Modal */}
      <Modal
        isOpen={!!viewOrder}
        onClose={() => setViewOrder(null)}
        title={viewOrder ? `OS #${viewOrder.orderNumber}` : ''}
        size="lg"
      >
        {viewOrder && (
          <div className="space-y-4 sm:space-y-6">
            {/* Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Status</p>
                <Badge variant={STATUS_CONFIG[viewOrder.status].variant} className="mt-1">
                  {STATUS_CONFIG[viewOrder.status].label}
                </Badge>
              </div>
              <div className="sm:text-right">
                <p className="text-xs sm:text-sm text-gray-500">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {formatCurrency(viewOrder.totalAmount)}
                </p>
              </div>
            </div>

            {/* Client Info */}
            <div className="border-t pt-4">
              <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Cliente</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-sm sm:text-base text-gray-900">{viewOrder.client.name}</p>
                <p className="text-xs sm:text-sm text-gray-700">{viewOrder.client.phone}</p>
                {viewOrder.client.email && (
                  <p className="text-xs sm:text-sm text-gray-700">{viewOrder.client.email}</p>
                )}
              </div>
            </div>

            {/* Description */}
            {viewOrder.description && (
              <div className="border-t pt-4">
                <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Descrição</h4>
                <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg">
                  {viewOrder.description}
                </p>
              </div>
            )}

            {/* Services */}
            {viewOrder.services.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Serviços</h4>
              <div className="space-y-2">
                {viewOrder.services.map((service) => (
                  <div
                    key={service.id}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50 p-3 rounded-lg gap-1 sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base text-gray-900 truncate">
                        {service.serviceName}
                        {service.packageUsage && <span className="ml-1 text-xs text-blue-600">(pacote)</span>}
                      </p>
                      {service.description && (
                        <p className="text-xs sm:text-sm text-gray-700 truncate">{service.description}</p>
                      )}
                      {(service.equipments?.length ?? 0) > 0 && (
                        <p className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                          <Wrench className="h-3 w-3 shrink-0" />
                          Equipamentos: {service.equipments!.map((e) => e.equipment.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="sm:text-right flex sm:flex-col justify-between sm:justify-end items-center sm:items-end">
                      <p className="text-xs sm:text-sm text-gray-700">
                        {formatCurrency(service.price)} x {service.quantity}
                      </p>
                      <p className="font-semibold text-green-600 text-sm sm:text-base">
                        {formatCurrency(service.price * service.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Products */}
            {(viewOrder.products?.length ?? 0) > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Produtos</h4>
                <div className="space-y-2">
                  {viewOrder.products!.map((p) => (
                    <div key={p.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg gap-4">
                      <p className="min-w-0 font-medium text-sm sm:text-base text-gray-900 truncate">{p.name}</p>
                      <div className="text-right shrink-0">
                        <p className="text-xs sm:text-sm text-gray-700">
                          {formatCurrency(Number(p.unitPrice))} x {p.quantity}
                        </p>
                        <p className="font-semibold text-green-600 text-sm sm:text-base">
                          {formatCurrency(Number(p.unitPrice) * p.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="border-t pt-4 text-xs sm:text-sm text-gray-600 space-y-1">
              <p>Criado em: {formatDate(viewOrder.createdAt)}</p>
              <p>Atualizado em: {formatDate(viewOrder.updatedAt)}</p>
            </div>

            {/* Ações da OS: no celular empilham de baixo para cima (Editar no topo, Excluir embaixo) */}
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-end gap-2 sm:gap-3 border-t pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteConfirm(viewOrder.id)
                  setViewOrder(null)
                }}
                className="w-full sm:w-auto sm:mr-auto text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
              <Button variant="outline" onClick={() => setViewOrder(null)} className="w-full sm:w-auto">
                Fechar
              </Button>
              {viewOrder.status !== 'PAID' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusChangeOrder(viewOrder)
                    setViewOrder(null)
                  }}
                  className="w-full sm:w-auto"
                >
                  Alterar status
                </Button>
              )}
              {NEXT_STATUS[viewOrder.status] && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewOrder(null)
                    advanceStatus(viewOrder)
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  {NEXT_STATUS[viewOrder.status]!.label}
                </Button>
              )}
              {viewOrder.status !== 'FINISHED' && viewOrder.status !== 'PAID' && (
                <Button
                  onClick={() => {
                    setViewOrder(null)
                    handleEdit(viewOrder)
                  }}
                  className="w-full sm:w-auto"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Status Change Modal */}
      <Modal
        isOpen={!!statusChangeOrder}
        onClose={() => {
          setStatusChangeOrder(null)
          setPausedReason('')
        }}
        title="Alterar Status"
      >
        {statusChangeOrder && (
          <div className="space-y-4">
            <p className="text-sm sm:text-base text-gray-600">
              Alterar status da OS <strong>#{statusChangeOrder.orderNumber}</strong>
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              Status atual:{' '}
              <Badge variant={STATUS_CONFIG[statusChangeOrder.status].variant}>
                {STATUS_CONFIG[statusChangeOrder.status].label}
              </Badge>
            </p>

            {statusChangeOrder.status === 'PAID' ? (
              <p className="text-green-600 bg-green-50 p-3 rounded-lg text-xs sm:text-sm">
                Esta ordem já foi paga e não pode ter seu status alterado.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-xs sm:text-sm font-medium text-gray-700">Selecione o novo status:</p>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                    const Icon = config.icon
                    const isCurrentStatus = status === statusChangeOrder.status
                    const isDisabled =
                      (status === 'RECEIVED' && statusChangeOrder.status !== 'RECEIVED') ||
                      (status === 'PAID' && statusChangeOrder.status !== 'FINISHED')

                    return (
                      <button
                        key={status}
                        onClick={() => {
                          if (isCurrentStatus || isDisabled) return
                          if (status === 'PAUSED') return
                          handleStatusChange(statusChangeOrder.id, status)
                        }}
                        disabled={isCurrentStatus || isDisabled}
                        className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border transition-colors text-left ${
                          isCurrentStatus
                            ? 'bg-blue-50 border-blue-200 cursor-default'
                            : isDisabled
                            ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                            : 'hover:bg-gray-50 cursor-pointer'
                        }`}
                      >
                        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${
                          status === 'RECEIVED' ? 'text-gray-500' :
                          status === 'IN_PROGRESS' ? 'text-blue-500' :
                          status === 'PAUSED' ? 'text-amber-500' :
                          status === 'PAID' ? 'text-emerald-600' : 'text-green-500'
                        }`} />
                        <span className="font-medium text-gray-900 text-sm sm:text-base">{config.label}</span>
                        {isCurrentStatus && (
                          <span className="ml-auto text-xs text-blue-600">(atual)</span>
                        )}
                        {status === 'FINISHED' && !isCurrentStatus && (
                          <span className="ml-auto text-xs text-gray-500 hidden sm:inline">
                            (notifica cliente)
                          </span>
                        )}
                        {status === 'PAUSED' && !isCurrentStatus && (
                          <span className="ml-auto text-xs text-gray-500 hidden sm:inline">
                            (informar motivo)
                          </span>
                        )}
                        {status === 'PAID' && !isCurrentStatus && (
                          <span className="ml-auto text-xs text-gray-500 hidden sm:inline">
                            (após finalizar)
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Campo de motivo para status PAUSED */}
                {statusChangeOrder.status !== 'PAUSED' && statusChangeOrder.status !== 'FINISHED' && (
                  <div className="bg-amber-50 p-3 sm:p-4 rounded-lg border border-amber-200">
                    <label className="block text-xs sm:text-sm font-medium text-amber-800 mb-2">
                      Motivo da Pausa (opcional)
                    </label>
                    <Textarea
                      placeholder="Ex: Aguardando peça chegar..."
                      value={pausedReason}
                      onChange={(e) => setPausedReason(e.target.value)}
                      rows={3}
                      className="bg-white text-sm"
                    />
                    <p className="text-xs text-amber-600 mt-2">
                      Este motivo será enviado na mensagem WhatsApp.
                    </p>
                    <Button
                      className="mt-3 w-full"
                      onClick={() => handleStatusChange(statusChangeOrder.id, 'PAUSED', pausedReason)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Alterar para Pausado
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end border-t pt-4">
              <Button variant="outline" onClick={() => {
                setStatusChangeOrder(null)
                setPausedReason('')
              }} className="w-full sm:w-auto">
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <p className="text-sm sm:text-base text-gray-600">
            Tem certeza que deseja excluir esta ordem de serviço? Esta ação não pode ser desfeita.
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="w-full sm:w-auto"
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
