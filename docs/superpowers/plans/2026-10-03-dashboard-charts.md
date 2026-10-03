# Gráficos no Dashboard — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cinco gráficos no dashboard (OS por status, OS ao longo do tempo, serviços mais vendidos, top clientes, novos clientes por mês), filtrados por período e perfil.

**Architecture:** Um helper `getDashboardScope` centraliza o filtro por perfil e é usado pela rota de stats existente e pela nova rota `GET /api/dashboard/charts`, que devolve todas as séries agregadas em JavaScript. No front, `useDashboardCharts` alimenta componentes Recharts em `src/components/dashboard/`, montados numa seção "Gráficos" do dashboard.

**Tech Stack:** Next.js 14, Prisma 7, TanStack Query 5, Recharts 3 (já instalada), Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-03-dashboard-charts-design.md`

**Desvios do spec, por exigência da skill `dataviz` (não negociáveis dela):**
1. **Sem eixo duplo.** "OS ao longo do tempo" vira barras de um único eixo com alternância **Quantidade | Faturamento** no cabeçalho do card. O faturamento também aparece no tooltip do modo Quantidade.
2. **Paleta da rosca.** As cores dos cards de status reprovaram no validador da skill (verde↔esmeralda ΔE 14,7; verde↔âmbar CVD 5,7). A rosca usa a paleta categórica de referência validada, em ordem fixa por status: Recebido `#2a78d6`, Em Andamento `#eb6834`, Pausado `#1baf7a`, Finalizado `#eda100`, Pago `#e87ba4`. Legenda sempre presente.
3. **Marcas.** Barras ≤ 24px com ponta arredondada 4px; grade hairline sólida `#e1e0d9`; texto de eixo `#898781`; séries únicas em `#2a78d6`.

**Testes:** sem runner no projeto. Verificação: `npx tsc --noEmit`, `npm run lint`, roteiro manual (Task 7).

---

### Task 1: `getDashboardScope` e refactor da rota de stats

**Files:**
- Create: `src/lib/dashboard-scope.ts`
- Modify: `src/app/api/dashboard/stats/route.ts:1-45`

- [ ] **Step 1: Criar o helper**

```ts
// src/lib/dashboard-scope.ts
import { Prisma } from '@prisma/client'
import type { AuthUser } from '@/lib/auth-utils'

export interface DashboardScope {
  orderWhere: Prisma.ServiceOrderWhereInput
  clientWhere: Prisma.ClientWhereInput
}

/**
 * Filtro de visibilidade do dashboard por perfil.
 * SUPER_ADMIN: tudo. COMPANY_ADMIN e MANAGER: a própria empresa.
 * EMPLOYEE: a própria loja.
 */
export function getDashboardScope(user: AuthUser): DashboardScope {
  if (user.role === 'SUPER_ADMIN') {
    return { orderWhere: {}, clientWhere: {} }
  }
  if (user.role === 'COMPANY_ADMIN' || user.role === 'MANAGER') {
    const where = user.companyId ? { store: { companyId: user.companyId } } : {}
    return { orderWhere: where, clientWhere: where }
  }
  const where = user.storeId ? { storeId: user.storeId } : {}
  return { orderWhere: where, clientWhere: where }
}
```

- [ ] **Step 2: Usar o helper na rota de stats**

Substituir as linhas 1-45 de `src/app/api/dashboard/stats/route.ts` (do `import` até o `}` que fecha o bloco `if (Object.keys(dateFilter)...)`; a linha 47 `const [...] = await Promise.all([` permanece) por:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { getDashboardScope } from '@/lib/dashboard-scope'

// GET /api/dashboard/stats - Buscar estatísticas do dashboard
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const { orderWhere: scopeWhere, clientWhere } = getDashboardScope(user!)

    // Filtro por período
    const dateFilter: { gte?: Date; lt?: Date } = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setDate(end.getDate() + 1)
      dateFilter.lt = end
    }

    const orderWhere: Prisma.ServiceOrderWhereInput =
      Object.keys(dateFilter).length > 0 ? { ...scopeWhere, createdAt: dateFilter } : scopeWhere
```

O restante da rota (o `Promise.all` e o `return`) permanece igual.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` — Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/dashboard-scope.ts src/app/api/dashboard/stats/route.ts
git commit -m "refactor(dashboard): extrai filtro por perfil para getDashboardScope (corrige escopo de MANAGER)"
```

---

### Task 2: Rota `GET /api/dashboard/charts`

**Files:**
- Create: `src/app/api/dashboard/charts/route.ts`

- [ ] **Step 1: Criar a rota**

```ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { getDashboardScope } from '@/lib/dashboard-scope'

type Granularity = 'day' | 'month'

const MS_PER_DAY = 86_400_000
const REVENUE_STATUSES = new Set(['FINISHED', 'PAID'])

// Todas as chaves e janelas em UTC, consistente com new Date('YYYY-MM-DD') da rota de stats.
const dayKey = (d: Date) => d.toISOString().slice(0, 10)
const monthKey = (d: Date) => d.toISOString().slice(0, 7)
const utcMonthStart = (d: Date, monthsBack = 0) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - monthsBack, 1))

function buildBuckets(start: Date, end: Date, granularity: Granularity): string[] {
  const keys: string[] = []
  if (granularity === 'day') {
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
    while (cur <= end) {
      keys.push(dayKey(cur))
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
  } else {
    const cur = utcMonthStart(start)
    const last = utcMonthStart(end)
    while (cur <= last) {
      keys.push(monthKey(cur))
      cur.setUTCMonth(cur.getUTCMonth() + 1)
    }
  }
  return keys
}

const isValidDate = (d: Date) => !Number.isNaN(d.getTime())

function sortDesc<T>(items: T[], ...keys: ((t: T) => number | string)[]): T[] {
  return items.sort((a, b) => {
    for (const key of keys) {
      const ka = key(a)
      const kb = key(b)
      if (ka === kb) continue
      if (typeof ka === 'number' && typeof kb === 'number') return kb - ka // desc
      return String(ka).localeCompare(String(kb), 'pt-BR') // asc para strings
    }
    return 0
  })
}

// GET /api/dashboard/charts - Séries agregadas para os gráficos do dashboard
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const startParam = searchParams.get('startDate')
    const endParam = searchParams.get('endDate')
    const { orderWhere, clientWhere } = getDashboardScope(user!)

    // Resolver intervalo e granularidade
    const now = new Date()
    let rangeStart: Date
    let rangeEnd: Date
    let granularity: Granularity
    const periodWhere: { gte: Date; lt?: Date } = { gte: now }

    const start = startParam ? new Date(startParam) : null
    const end = endParam ? new Date(endParam) : null
    if (start && end && isValidDate(start) && isValidDate(end) && start <= end) {
      rangeStart = start
      rangeEnd = end
      granularity = (end.getTime() - start.getTime()) / MS_PER_DAY <= 31 ? 'day' : 'month'
      const lt = new Date(end)
      lt.setUTCDate(lt.getUTCDate() + 1)
      periodWhere.gte = start
      periodWhere.lt = lt
    } else {
      // "Todo período": últimos 12 meses, por mês
      rangeStart = utcMonthStart(now, 11)
      rangeEnd = now
      granularity = 'month'
      periodWhere.gte = rangeStart
    }

    const [orders, orderServices, clients] = await Promise.all([
      prisma.serviceOrder.findMany({
        where: { ...orderWhere, createdAt: periodWhere },
        select: {
          createdAt: true,
          totalAmount: true,
          status: true,
          clientId: true,
          client: { select: { name: true } },
        },
      }),
      prisma.orderService.findMany({
        where: { order: { ...orderWhere, createdAt: periodWhere } },
        select: {
          serviceName: true,
          price: true,
          quantity: true,
          order: { select: { clientId: true } },
        },
      }),
      prisma.client.findMany({
        where: { ...clientWhere, createdAt: { gte: utcMonthStart(now, 5) } },
        select: { createdAt: true },
      }),
    ])

    // ---- OS ao longo do tempo
    const keyOf = granularity === 'day' ? dayKey : monthKey
    const timeBuckets = new Map(
      buildBuckets(rangeStart, rangeEnd, granularity).map((period) => [period, { period, count: 0, revenue: 0 }])
    )
    for (const order of orders) {
      const bucket = timeBuckets.get(keyOf(order.createdAt))
      if (!bucket) continue
      bucket.count += 1
      if (REVENUE_STATUSES.has(order.status)) bucket.revenue += Number(order.totalAmount)
    }

    // ---- Serviços mais vendidos
    const serviceAgg = new Map<string, { name: string; quantity: number; total: number }>()
    for (const item of orderServices) {
      const agg = serviceAgg.get(item.serviceName) ?? { name: item.serviceName, quantity: 0, total: 0 }
      agg.quantity += item.quantity
      agg.total += Number(item.price) * item.quantity
      serviceAgg.set(item.serviceName, agg)
    }
    const topServices = sortDesc(Array.from(serviceAgg.values()), (s) => s.quantity, (s) => s.total, (s) => s.name).slice(0, 5)

    // ---- Top clientes
    const clientAgg = new Map<string, { id: string; name: string; orders: number; total: number }>()
    for (const order of orders) {
      const agg = clientAgg.get(order.clientId) ?? { id: order.clientId, name: order.client.name, orders: 0, total: 0 }
      agg.orders += 1
      agg.total += Number(order.totalAmount)
      clientAgg.set(order.clientId, agg)
    }
    const servicesByClient = new Map<string, Map<string, { name: string; quantity: number; total: number }>>()
    for (const item of orderServices) {
      const perClient = servicesByClient.get(item.order.clientId) ?? new Map()
      const agg = perClient.get(item.serviceName) ?? { name: item.serviceName, quantity: 0, total: 0 }
      agg.quantity += item.quantity
      agg.total += Number(item.price) * item.quantity
      perClient.set(item.serviceName, agg)
      servicesByClient.set(item.order.clientId, perClient)
    }
    const topClients = sortDesc(Array.from(clientAgg.values()), (c) => c.orders, (c) => c.total, (c) => c.name)
      .slice(0, 5)
      .map((c) => ({
        ...c,
        topServices: sortDesc(Array.from(servicesByClient.get(c.id)?.values() ?? []), (s) => s.quantity, (s) => s.total, (s) => s.name)
          .slice(0, 3)
          .map((s) => s.name),
      }))

    // ---- Novos clientes por mês (últimos 6 meses, ignora o período)
    const clientBuckets = new Map(
      buildBuckets(utcMonthStart(now, 5), now, 'month').map((period) => [period, { period, count: 0 }])
    )
    for (const client of clients) {
      const bucket = clientBuckets.get(monthKey(client.createdAt))
      if (bucket) bucket.count += 1
    }

    return NextResponse.json({
      granularity,
      ordersOverTime: Array.from(timeBuckets.values()),
      topServices,
      newClientsByMonth: Array.from(clientBuckets.values()),
      topClients,
    })
  } catch (error) {
    console.error('Erro ao buscar gráficos:', error)
    return NextResponse.json({ error: 'Erro ao buscar gráficos' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` — Expected: sem erros.

- [ ] **Step 3: Smoke test da rota**

Com o dev server no ar e logado no browser integrado, abrir `http://localhost:3001/api/dashboard/charts` e `.../charts?startDate=2026-10-03&endDate=2026-10-03`. Esperado: JSON com `granularity: "month"` (12 itens em `ordersOverTime`) e `"day"` (1 item), `topServices` com "teste", `topClients` com "Cliente Teste OS 2", `newClientsByMonth` com 6 itens.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/dashboard/charts/route.ts
git commit -m "feat(dashboard): rota /api/dashboard/charts com séries agregadas"
```

---

### Task 3: Hook `useDashboardCharts`

**Files:**
- Modify: `src/hooks/api/use-dashboard.ts` (acrescentar ao final)

- [ ] **Step 1: Adicionar tipos e hook**

```ts
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
```

Também exportar `DashboardStats` (trocar `interface DashboardStats` por `export interface DashboardStats`), pois `OrdersByStatusChart` recebe esse tipo.

- [ ] **Step 2: Typecheck e commit**

```bash
npx tsc --noEmit
git add src/hooks/api/use-dashboard.ts
git commit -m "feat(dashboard): hook useDashboardCharts"
```

---

### Task 4: Tema dos gráficos e `ChartCard`

**Files:**
- Create: `src/components/dashboard/chart-theme.ts`
- Create: `src/components/dashboard/ChartCard.tsx`

- [ ] **Step 1: Tema**

```ts
// src/components/dashboard/chart-theme.ts
// Valores da paleta de referência da skill dataviz (validada em modo claro).
export const CHART_COLORS = {
  series: '#2a78d6',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  ink: '#0b0b0b',
  secondary: '#52514e',
}

// Ordem fixa por status; cores validadas pelo validador da skill (adjacentes CVD ΔE ≥ 9).
export const STATUS_SERIES = [
  { key: 'ordersReceived', label: 'Recebido', color: '#2a78d6' },
  { key: 'ordersInProgress', label: 'Em Andamento', color: '#eb6834' },
  { key: 'ordersPaused', label: 'Pausado', color: '#1baf7a' },
  { key: 'ordersFinished', label: 'Finalizado', color: '#eda100' },
  { key: 'ordersPaid', label: 'Pago', color: '#e87ba4' },
] as const

export const axisTick = { fontSize: 12, fill: CHART_COLORS.muted }

export const tooltipContentStyle = {
  borderRadius: 8,
  border: `1px solid ${CHART_COLORS.grid}`,
  boxShadow: '0 4px 12px rgba(11,11,11,0.08)',
  fontSize: 12,
  color: CHART_COLORS.ink,
}

export const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const formatBRLCompact = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function formatPeriod(period: string, granularity: 'day' | 'month'): string {
  if (granularity === 'day') {
    const [, month, day] = period.split('-')
    return `${day}/${month}`
  }
  const [year, month] = period.split('-')
  return `${MONTHS[Number(month) - 1]}/${year.slice(2)}`
}
```

- [ ] **Step 2: ChartCard**

```tsx
// src/components/dashboard/ChartCard.tsx
'use client'

import { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  isLoading?: boolean
  isError?: boolean
  isEmpty?: boolean
  emptyMessage?: string
  children: ReactNode
}

function ChartMessage({ children }: { children: ReactNode }) {
  return <div className="h-full flex items-center justify-center text-sm text-gray-500">{children}</div>
}

export function ChartCard({
  title,
  subtitle,
  action,
  isLoading,
  isError,
  isEmpty,
  emptyMessage = 'Sem dados no período',
  children,
}: ChartCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="h-64">
        {isLoading ? (
          <div className="h-full rounded-lg bg-gray-100 animate-pulse" />
        ) : isError ? (
          <ChartMessage>Não foi possível carregar</ChartMessage>
        ) : isEmpty ? (
          <ChartMessage>{emptyMessage}</ChartMessage>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck e commit**

```bash
npx tsc --noEmit
git add src/components/dashboard/chart-theme.ts src/components/dashboard/ChartCard.tsx
git commit -m "feat(dashboard): tema de gráficos e ChartCard"
```

---

### Task 5: Os cinco gráficos

**Files:**
- Create: `src/components/dashboard/OrdersByStatusChart.tsx`
- Create: `src/components/dashboard/OrdersOverTimeChart.tsx`
- Create: `src/components/dashboard/TopServicesChart.tsx`
- Create: `src/components/dashboard/TopClientsChart.tsx`
- Create: `src/components/dashboard/NewClientsChart.tsx`
- Create: `src/components/dashboard/index.ts`

- [ ] **Step 1: OrdersByStatusChart**

```tsx
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
```

- [ ] **Step 2: OrdersOverTimeChart**

```tsx
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
```

- [ ] **Step 3: TopServicesChart**

```tsx
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
        <XAxis type="number" tick={axisTick} axisLine={{ stroke: CHART_COLORS.axis }} tickLine={false} allowDecimals={false} />
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
```

- [ ] **Step 4: TopClientsChart**

```tsx
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
```

- [ ] **Step 5: NewClientsChart**

```tsx
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
```

- [ ] **Step 6: index.ts**

```ts
export { ChartCard } from './ChartCard'
export { OrdersByStatusChart } from './OrdersByStatusChart'
export { OrdersOverTimeChart, type TimeMeasure } from './OrdersOverTimeChart'
export { TopServicesChart } from './TopServicesChart'
export { TopClientsChart } from './TopClientsChart'
export { NewClientsChart } from './NewClientsChart'
```

- [ ] **Step 7: Typecheck e lint**

Run: `npx tsc --noEmit && npm run lint` — Expected: sem erros. Se o tipo de `formatter`/`labelFormatter` do Recharts 3 reclamar, tipar o parâmetro explicitamente (`value: number | string | undefined`) em vez de usar `any`.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard
git commit -m "feat(dashboard): componentes dos cinco gráficos (Recharts)"
```

---

### Task 6: Seção "Gráficos" no dashboard

**Files:**
- Modify: `src/app/(authenticated)/page.tsx`

- [ ] **Step 1: Imports e estado**

Linha 7, trocar o import de hooks por:
```tsx
import { useDashboardStats, useDashboardCharts, useOrders } from '@/hooks/api'
import {
  ChartCard,
  OrdersByStatusChart,
  OrdersOverTimeChart,
  TopServicesChart,
  TopClientsChart,
  NewClientsChart,
  type TimeMeasure,
} from '@/components/dashboard'
```

Após `const [periodFilter, setPeriodFilter] = useState('')` adicionar:
```tsx
  const [timeMeasure, setTimeMeasure] = useState<TimeMeasure>('count')
```

Após a chamada de `useOrders(...)` adicionar:
```tsx
  const {
    data: charts,
    isLoading: chartsLoading,
    isError: chartsError,
  } = useDashboardCharts({
    startDate: dateFilters.startDate,
    endDate: dateFilters.endDate,
  })
```

**Não** incluir `chartsLoading` em `isLoading`.

Após `const isLoading = ...` adicionar os helpers de vazio:
```tsx
  const statusTotal =
    (stats?.ordersReceived || 0) +
    (stats?.ordersInProgress || 0) +
    (stats?.ordersPaused || 0) +
    (stats?.ordersFinished || 0) +
    (stats?.ordersPaid || 0)
  const noOrdersOverTime = !charts || charts.ordersOverTime.every((b) => b.count === 0)
  const noNewClients = !charts || charts.newClientsByMonth.every((b) => b.count === 0)
```

- [ ] **Step 2: Seção de gráficos**

Inserir entre o fechamento do grid "Revenue Cards" (linha 224, `</div>`) e o comentário `{/* Quick Actions */}`:

```tsx
      {/* Gráficos */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Gráficos</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          <ChartCard title="OS por status" isEmpty={statusTotal === 0}>
            {stats && <OrdersByStatusChart stats={stats} />}
          </ChartCard>

          <ChartCard
            title="OS ao longo do tempo"
            subtitle={timeMeasure === 'count' ? 'Quantidade de OS criadas' : 'Faturamento (finalizadas + pagas)'}
            isLoading={chartsLoading}
            isError={chartsError}
            isEmpty={noOrdersOverTime}
            action={
              <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
                {(
                  [
                    ['count', 'Quantidade'],
                    ['revenue', 'Faturamento'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTimeMeasure(key)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      timeMeasure === key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            }
          >
            {charts && (
              <OrdersOverTimeChart data={charts.ordersOverTime} granularity={charts.granularity} measure={timeMeasure} />
            )}
          </ChartCard>

          <ChartCard
            title="Serviços mais vendidos"
            subtitle="Top 5 por quantidade"
            isLoading={chartsLoading}
            isError={chartsError}
            isEmpty={!charts || charts.topServices.length === 0}
          >
            {charts && <TopServicesChart data={charts.topServices} />}
          </ChartCard>

          <ChartCard
            title="Top clientes"
            subtitle="Top 5 por número de OS"
            isLoading={chartsLoading}
            isError={chartsError}
            isEmpty={!charts || charts.topClients.length === 0}
          >
            {charts && <TopClientsChart data={charts.topClients} />}
          </ChartCard>

          <ChartCard
            title="Novos clientes por mês"
            subtitle="Últimos 6 meses, independente do filtro"
            isLoading={chartsLoading}
            isError={chartsError}
            isEmpty={noNewClients}
            emptyMessage="Nenhum cliente cadastrado nos últimos 6 meses"
          >
            {charts && <NewClientsChart data={charts.newClientsByMonth} />}
          </ChartCard>
        </div>
      </div>
```

- [ ] **Step 3: Typecheck, lint, commit**

```bash
npx tsc --noEmit && npm run lint
git add "src/app/(authenticated)/page.tsx"
git commit -m "feat(dashboard): seção Gráficos com os cinco gráficos"
```

---

### Task 7: Verificação manual

Dev server `http://localhost:3001`, logado como `admin@servicoagora.com`.

- [ ] 1. Dashboard carrega; cards aparecem antes dos gráficos; seção "Gráficos" com 5 cards em 2 colunas.
- [ ] 2. Rosca: 1 fatia "Recebido", total 1 no centro, legenda com o rótulo. Bate com o card "OS Recebidas".
- [ ] 3. "OS ao longo do tempo" em "Todo período": 12 meses, barra em out/26 = 1. Alternar para Faturamento: R$ 0 (OS está Recebida). Filtro "Hoje": 1 bucket `03/10`.
- [ ] 4. "Serviços mais vendidos": "teste", 1 un., tooltip mostra R$ 50,00.
- [ ] 5. "Top clientes": "Cliente Teste OS 2", R$ 50,00, tooltip "em 1 OS", "Serviços: teste".
- [ ] 6. "Novos clientes por mês": 6 barras, out/26 = 2.
- [ ] 7. Filtro "Mês passado": 4 cards dependentes mostram "Sem dados no período"; novos clientes inalterado.
- [ ] 8. Viewport 375px: 1 coluna, sem scroll horizontal, rótulos do eixo legíveis.
- [ ] 9. Screenshots como evidência; `tsc` e `lint` limpos.
