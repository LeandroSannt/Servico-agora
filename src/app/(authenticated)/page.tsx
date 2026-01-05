'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ClipboardList, Users, Clock, CheckCircle, Play, Plus, DollarSign, Calendar, Inbox, Pause } from 'lucide-react'
import { Button, Badge, Select } from '@/components/ui'
import { useDashboardStats, useOrders } from '@/hooks/api'

const STATUS_CONFIG = {
  RECEIVED: { label: 'Recebido', variant: 'secondary' as const, icon: Inbox },
  IN_PROGRESS: { label: 'Em Andamento', variant: 'info' as const, icon: Play },
  PAUSED: { label: 'Pausado', variant: 'warning' as const, icon: Pause },
  FINISHED: { label: 'Finalizado', variant: 'success' as const, icon: CheckCircle },
  PAID: { label: 'Pago', variant: 'default' as const, icon: DollarSign },
}

const PERIOD_OPTIONS = [
  { value: '', label: 'Todo período' },
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'week', label: 'Últimos 7 dias' },
  { value: 'month', label: 'Este mês' },
  { value: 'lastMonth', label: 'Mês passado' },
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

export default function Dashboard() {
  const [periodFilter, setPeriodFilter] = useState('')

  const dateFilters = useMemo(() => getDateRange(periodFilter), [periodFilter])

  const { data: stats, isLoading: statsLoading } = useDashboardStats({
    startDate: dateFilters.startDate,
    endDate: dateFilters.endDate,
  })
  const { data: ordersData, isLoading: ordersLoading } = useOrders({
    limit: 5,
    startDate: dateFilters.startDate,
    endDate: dateFilters.endDate,
  })

  const recentOrders = ordersData?.data || []
  const isLoading = statsLoading || ordersLoading

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
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statsCards = [
    {
      label: 'OS Recebidas',
      value: stats?.ordersReceived || 0,
      icon: Inbox,
      color: 'bg-gray-500',
      href: '/orders?status=RECEIVED',
    },
    {
      label: 'OS Em Andamento',
      value: stats?.ordersInProgress || 0,
      icon: Play,
      color: 'bg-blue-500',
      href: '/orders?status=IN_PROGRESS',
    },
    {
      label: 'OS Pausadas',
      value: stats?.ordersPaused || 0,
      icon: Pause,
      color: 'bg-amber-500',
      href: '/orders?status=PAUSED',
    },
    {
      label: 'OS Finalizadas',
      value: stats?.ordersFinished || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      href: '/orders?status=FINISHED',
    },
    {
      label: 'OS Pagas',
      value: stats?.ordersPaid || 0,
      icon: DollarSign,
      color: 'bg-emerald-600',
      href: '/orders?status=PAID',
    },
    {
      label: 'Total de Clientes',
      value: stats?.totalClients || 0,
      icon: Users,
      color: 'bg-purple-500',
      href: '/clients',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-0.5 sm:mt-1">Visão geral do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500 hidden sm:block" />
          <Select
            options={PERIOD_OPTIONS}
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="w-full sm:w-48"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="sm:ml-3 lg:ml-4">
                  <p className="text-xs sm:text-sm text-gray-500 leading-tight">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-800">{stat.value}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* Receita Confirmada (Pago) */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg shadow-sm p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-emerald-100 text-xs sm:text-sm">Receita Confirmada</p>
              <p className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 truncate">{formatCurrency(stats?.totalPaid || 0)}</p>
              <p className="text-emerald-200 text-xs mt-0.5 sm:mt-1">OS Pagas</p>
            </div>
            <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-200 flex-shrink-0" />
          </div>
        </div>

        {/* Aguardando Pagamento (Finalizadas) */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg shadow-sm p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-amber-100 text-xs sm:text-sm">Aguardando Pagamento</p>
              <p className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 truncate">{formatCurrency(stats?.totalPending || 0)}</p>
              <p className="text-amber-200 text-xs mt-0.5 sm:mt-1">OS Finalizadas</p>
            </div>
            <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-amber-200 flex-shrink-0" />
          </div>
        </div>

        {/* Total Geral */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-sm p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-blue-100 text-xs sm:text-sm">Faturamento Total</p>
              <p className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 truncate">{formatCurrency(stats?.totalRevenue || 0)}</p>
              <p className="text-blue-200 text-xs mt-0.5 sm:mt-1">Finalizadas + Pagas</p>
            </div>
            <DollarSign className="h-8 w-8 sm:h-10 sm:w-10 text-blue-200 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Ações Rápidas</h2>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4">
          <Link href="/orders" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto justify-center">
              <Plus className="h-4 w-4 mr-2" />
              Nova Ordem de Serviço
            </Button>
          </Link>
          <Link href="/clients" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto justify-center">
              <Users className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </Link>
          <Link href="/services" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto justify-center">
              <ClipboardList className="h-4 w-4 mr-2" />
              Gerenciar Serviços
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">Ordens Recentes</h2>
          <Link href="/orders" className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium">
            Ver todas
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-gray-500">
            <ClipboardList className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
            <p className="text-sm sm:text-base">Nenhuma ordem de serviço encontrada</p>
            <Link href="/orders" className="text-blue-600 hover:underline mt-2 inline-block text-sm">
              Criar primeira ordem
            </Link>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {recentOrders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status]
              const StatusIcon = statusConfig.icon
              return (
                <Link
                  key={order.id}
                  href={`/orders`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-2 sm:gap-4"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="font-mono text-xs sm:text-sm font-medium text-gray-600 flex-shrink-0">
                      #{order.orderNumber}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{order.client.name}</p>
                      <p className="text-xs sm:text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                    <Badge variant={statusConfig.variant} className="text-xs">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      <span className="hidden xs:inline sm:inline">{statusConfig.label}</span>
                      <span className="xs:hidden sm:hidden">{statusConfig.label.slice(0, 3)}</span>
                    </Badge>
                    <span className="font-semibold text-green-600 text-sm sm:text-base whitespace-nowrap">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
