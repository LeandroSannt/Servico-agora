'use client'

import { useState, useMemo } from 'react'
import { Search, Plus, Edit2, Trash2, Eye, ClipboardList, Play, CheckCircle, ArrowRight, Calendar, X, DollarSign, Inbox, Pause, MoreVertical } from 'lucide-react'
import { Button, Input, Modal, Badge, EmptyState, Select, Textarea } from '@/components/ui'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import OrderForm from '@/components/forms/OrderForm'
import { useOrders, useDeleteOrder, useUpdateOrderStatus } from '@/hooks/api'

interface OrderService {
  id: string
  serviceName: string
  description: string | null
  price: number
  quantity: number
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

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [viewOrder, setViewOrder] = useState<Order | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [statusChangeOrder, setStatusChangeOrder] = useState<Order | null>(null)
  const [pausedReason, setPausedReason] = useState('')
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)

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
    startDate: dateFilters.startDate,
    endDate: dateFilters.endDate,
    limit: 50,
  })
  const deleteMutation = useDeleteOrder()
  const updateStatusMutation = useUpdateOrderStatus()

  const orders = ordersData?.data || []

  const handleCreate = () => {
    setSelectedOrder(null)
    setIsModalOpen(true)
  }

  const handleEdit = (order: Order) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
    setOpenActionsId(null)
  }

  const handleView = (order: Order) => {
    setViewOrder(order)
    setOpenActionsId(null)
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

  const formatDateShort = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    })
  }

  // Mobile card view for orders
  const OrderCard = ({ order }: { order: Order }) => {
    const statusConfig = STATUS_CONFIG[order.status]
    const StatusIcon = statusConfig.icon

    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-gray-800">#{order.orderNumber}</span>
              <Badge variant={statusConfig.variant} className="text-xs">
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="font-medium text-gray-900 mt-1 truncate">{order.client.name}</p>
            <p className="text-xs text-gray-500">{order.client.phone}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setOpenActionsId(openActionsId === order.id ? null : order.id)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <MoreVertical className="h-5 w-5 text-gray-500" />
            </button>
            {openActionsId === order.id && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setOpenActionsId(null)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-20 min-w-[140px]">
                  <button
                    onClick={() => handleView(order)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Visualizar
                  </button>
                  <button
                    onClick={() => handleEdit(order)}
                    disabled={order.status === 'FINISHED' || order.status === 'PAID'}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit2 className="h-4 w-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirm(order.id)
                      setOpenActionsId(null)
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-xs text-gray-500">{formatDateShort(order.createdAt)}</p>
            <p className="font-semibold text-green-600">{formatCurrency(order.totalAmount)}</p>
          </div>
          {NEXT_STATUS[order.status] && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (NEXT_STATUS[order.status]!.status === 'PAUSED') {
                  setStatusChangeOrder(order)
                } else {
                  handleStatusChange(order.id, NEXT_STATUS[order.status]!.status)
                }
              }}
              disabled={updateStatusMutation.isPending}
              className="text-xs"
            >
              <ArrowRight className="h-3 w-3 mr-1" />
              {NEXT_STATUS[order.status]!.label}
            </Button>
          )}
        </div>
      </div>
    )
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
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const statusConfig = STATUS_CONFIG[order.status]
                  const StatusIcon = statusConfig.icon
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-medium">
                        #{order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.client.name}</p>
                          <p className="text-sm text-gray-500">{order.client.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{order.store.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setStatusChangeOrder(order)}
                            className="inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                            title="Clique para alterar status"
                          >
                            <Badge variant={statusConfig.variant}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </button>
                          {NEXT_STATUS[order.status] && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (NEXT_STATUS[order.status]!.status === 'PAUSED') {
                                  setStatusChangeOrder(order)
                                } else {
                                  handleStatusChange(order.id, NEXT_STATUS[order.status]!.status)
                                }
                              }}
                              disabled={updateStatusMutation.isPending}
                              className="text-xs px-2 py-1 h-auto"
                              title={`Avançar para ${NEXT_STATUS[order.status]!.label}`}
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              {NEXT_STATUS[order.status]!.label}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(order)}
                            disabled={order.status === 'FINISHED' || order.status === 'PAID'}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(order.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
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
                <p className="font-medium text-sm sm:text-base">{viewOrder.client.name}</p>
                <p className="text-xs sm:text-sm text-gray-600">{viewOrder.client.phone}</p>
                {viewOrder.client.email && (
                  <p className="text-xs sm:text-sm text-gray-600">{viewOrder.client.email}</p>
                )}
              </div>
            </div>

            {/* Description */}
            {viewOrder.description && (
              <div className="border-t pt-4">
                <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Descrição</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {viewOrder.description}
                </p>
              </div>
            )}

            {/* Services */}
            <div className="border-t pt-4">
              <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Serviços</h4>
              <div className="space-y-2">
                {viewOrder.services.map((service) => (
                  <div
                    key={service.id}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50 p-3 rounded-lg gap-1 sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{service.serviceName}</p>
                      {service.description && (
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{service.description}</p>
                      )}
                    </div>
                    <div className="sm:text-right flex sm:flex-col justify-between sm:justify-end items-center sm:items-end">
                      <p className="text-xs sm:text-sm text-gray-500">
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

            {/* Dates */}
            <div className="border-t pt-4 text-xs sm:text-sm text-gray-500 space-y-1">
              <p>Criado em: {formatDate(viewOrder.createdAt)}</p>
              <p>Atualizado em: {formatDate(viewOrder.updatedAt)}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t pt-4">
              <Button variant="outline" onClick={() => setViewOrder(null)} className="w-full sm:w-auto">
                Fechar
              </Button>
              {viewOrder.status !== 'FINISHED' && viewOrder.status !== 'PAID' && (
                <Button onClick={() => {
                  setViewOrder(null)
                  handleEdit(viewOrder)
                }} className="w-full sm:w-auto">
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
