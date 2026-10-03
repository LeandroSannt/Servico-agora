'use client'

import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { ChartGranularity, DashboardCharts } from '@/hooks/api'
import { CHART_COLORS, axisTick, tooltipContentStyle, formatBRL, formatBRLCompact, formatPeriod } from './chart-theme'

export type TimeMeasure = 'count' | 'revenue'

interface Props {
  data: DashboardCharts['ordersOverTime']
  granularity: ChartGranularity
  measure: TimeMeasure
}

export function OrdersOverTimeChart({ data, granularity, measure }: Props) {
  const isRevenue = measure === 'revenue'
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
        <XAxis
          dataKey="period"
          tickFormatter={(p: string) => formatPeriod(p, granularity)}
          tick={axisTick}
          axisLine={{ stroke: CHART_COLORS.axis }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={isRevenue ? 64 : 32}
          tickFormatter={isRevenue ? (v: number) => formatBRLCompact(v) : undefined}
        />
        <Tooltip
          cursor={{ fill: 'rgba(11,11,11,0.04)' }}
          contentStyle={tooltipContentStyle}
          labelFormatter={(p) => formatPeriod(String(p), granularity)}
          formatter={(value, _name, item) => {
            const row = item.payload as DashboardCharts['ordersOverTime'][number]
            return isRevenue
              ? [formatBRL(Number(value)), 'Faturamento']
              : [`${value} OS · ${formatBRL(row.revenue)}`, 'Quantidade']
          }}
        />
        <Bar dataKey={measure} fill={CHART_COLORS.series} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}
