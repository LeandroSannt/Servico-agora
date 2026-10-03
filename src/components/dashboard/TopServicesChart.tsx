'use client'

import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { DashboardCharts } from '@/hooks/api'
import { CHART_COLORS, axisTick, tooltipContentStyle, formatBRL } from './chart-theme'

interface Props {
  data: DashboardCharts['topServices']
}

export function TopServicesChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
        <XAxis
          type="number"
          tick={axisTick}
          axisLine={{ stroke: CHART_COLORS.axis }}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis type="category" dataKey="name" width={120} tick={axisTick} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(11,11,11,0.04)' }}
          contentStyle={tooltipContentStyle}
          formatter={(value, _name, item) => {
            const row = item.payload as DashboardCharts['topServices'][number]
            return [`${value} un. · ${formatBRL(row.total)}`, 'Vendidos']
          }}
        />
        <Bar dataKey="quantity" fill={CHART_COLORS.series} radius={[0, 4, 4, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}
