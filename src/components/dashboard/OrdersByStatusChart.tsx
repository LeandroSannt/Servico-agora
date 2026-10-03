'use client'

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, Label } from 'recharts'
import type { DashboardStats } from '@/hooks/api'
import { STATUS_SERIES, tooltipContentStyle } from './chart-theme'

interface Props {
  stats: DashboardStats
}

export function OrdersByStatusChart({ stats }: Props) {
  const data = STATUS_SERIES.map((s) => ({ name: s.label, value: stats[s.key], color: s.color })).filter(
    (d) => d.value > 0
  )
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          stroke="none"
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
          <Label value={total} position="center" style={{ fontSize: 24, fontWeight: 600, fill: '#0b0b0b' }} />
        </Pie>
        <Tooltip contentStyle={tooltipContentStyle} formatter={(value, name) => [`${value} OS`, name]} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-gray-700">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
