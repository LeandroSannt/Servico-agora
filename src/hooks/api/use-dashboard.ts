import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

interface DashboardStats {
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
