'use client'

import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { DashboardCharts } from '@/hooks/api'
import { CHART_COLORS, axisTick, tooltipContentStyle, formatPeriod } from './chart-theme'

interface Props {
  data: DashboardCharts['newClientsByMonth']
}

export function NewClientsChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
        <XAxis
          dataKey="period"
          tickFormatter={(p: string) => formatPeriod(p, 'month')}
          tick={axisTick}
          axisLine={{ stroke: CHART_COLORS.axis }}
          tickLine={false}
        />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
        <Tooltip
          cursor={{ fill: 'rgba(11,11,11,0.04)' }}
          contentStyle={tooltipContentStyle}
          labelFormatter={(p) => formatPeriod(String(p), 'month')}
          formatter={(value) => [`${value}`, 'Novos clientes']}
        />
        <Bar dataKey="count" fill={CHART_COLORS.series} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}
