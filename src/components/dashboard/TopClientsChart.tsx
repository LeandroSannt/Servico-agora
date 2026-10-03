'use client'

import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { DashboardCharts } from '@/hooks/api'
import { CHART_COLORS, axisTick, tooltipContentStyle, formatBRL, formatBRLCompact } from './chart-theme'

interface Props {
  data: DashboardCharts['topClients']
}

type Row = DashboardCharts['topClients'][number]

function ClientTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload: Row }> }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div style={{ ...tooltipContentStyle, background: '#fff', padding: '8px 12px' }}>
      <p className="font-semibold">{row.name}</p>
      <p>
        <strong>{formatBRL(row.total)}</strong> em {row.orders} OS
      </p>
      {row.topServices.length > 0 && (
        <p className="text-gray-600 mt-1">Serviços: {row.topServices.join(', ')}</p>
      )}
    </div>
  )
}

export function TopClientsChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
        <XAxis
          type="number"
          tick={axisTick}
          axisLine={{ stroke: CHART_COLORS.axis }}
          tickLine={false}
          tickFormatter={(v: number) => formatBRLCompact(v)}
        />
        <YAxis type="category" dataKey="name" width={120} tick={axisTick} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: 'rgba(11,11,11,0.04)' }} content={<ClientTooltip />} />
        <Bar dataKey="total" fill={CHART_COLORS.series} radius={[0, 4, 4, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}
