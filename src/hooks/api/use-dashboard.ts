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
}

interface UseDashboardStatsParams {
  startDate?: string
  endDate?: string
}

export function useDashboardStats(params: UseDashboardStatsParams = {}) {
  const { startDate, endDate } = params

  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', { startDate, endDate }],
    queryFn: async () => {
      const { data } = await axios.get('/api/dashboard/stats', {
        params: { startDate, endDate },
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
  const { startDate, endDate } = params

  return useQuery<DashboardCharts>({
    queryKey: ['dashboard-charts', { startDate, endDate }],
    queryFn: async () => {
      const { data } = await axios.get('/api/dashboard/charts', {
        params: { startDate, endDate },
      })
      return data
    },
  })
}
