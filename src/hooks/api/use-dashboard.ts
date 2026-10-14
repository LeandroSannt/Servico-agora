import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export interface DashboardStats {
  ordersReceived: number
  ordersInProgress: number
  ordersPaused: number
  ordersFinished: number
  ordersPaid: number
  totalClients: number
  totalPending: number
  totalPaid: number
  totalRevenue: number
  packagesRevenue: number
}

interface UseDashboardStatsParams {
  startDate?: string
  endDate?: string
  companyId?: string
  storeId?: string
}

export function useDashboardStats(params: UseDashboardStatsParams = {}) {
  const { startDate, endDate, companyId, storeId } = params

  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', { startDate, endDate, companyId, storeId }],
    queryFn: async () => {
      const { data } = await axios.get('/api/dashboard/stats', {
        params: { startDate, endDate, companyId, storeId },
      })
      return data
    },
  })
}

export type ChartGranularity = 'day' | 'month'

export interface DashboardCharts {
  granularity: ChartGranularity
  ordersOverTime: { period: string; count: number; revenue: number }[]
  topServices: { name: string; quantity: number; total: number }[]
  newClientsByMonth: { period: string; count: number }[]
  topClients: { id: string; name: string; orders: number; total: number; topServices: string[] }[]
}

export function useDashboardCharts(params: UseDashboardStatsParams = {}) {
  const { startDate, endDate, companyId, storeId } = params

  return useQuery<DashboardCharts>({
    queryKey: ['dashboard-charts', { startDate, endDate, companyId, storeId }],
    queryFn: async () => {
      const { data } = await axios.get('/api/dashboard/charts', {
        params: { startDate, endDate, companyId, storeId },
      })
      return data
    },
  })
}
