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

// Ordena por várias chaves: números em ordem decrescente, strings em ordem crescente.
function sortDesc<T>(items: T[], ...keys: ((t: T) => number | string)[]): T[] {
  return items.sort((a, b) => {
    for (const key of keys) {
      const ka = key(a)
      const kb = key(b)
      if (ka === kb) continue
      if (typeof ka === 'number' && typeof kb === 'number') return kb - ka
      return String(ka).localeCompare(String(kb), 'pt-BR')
    }
    return 0
  })
}

interface ServiceAgg {
  name: string
  quantity: number
  total: number
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
    const serviceAgg = new Map<string, ServiceAgg>()
    for (const item of orderServices) {
      const agg = serviceAgg.get(item.serviceName) ?? { name: item.serviceName, quantity: 0, total: 0 }
      agg.quantity += item.quantity
      agg.total += Number(item.price) * item.quantity
      serviceAgg.set(item.serviceName, agg)
    }
    const topServices = sortDesc(
      Array.from(serviceAgg.values()),
      (s) => s.quantity,
      (s) => s.total,
      (s) => s.name
    ).slice(0, 5)

    // ---- Top clientes
    const clientAgg = new Map<string, { id: string; name: string; orders: number; total: number }>()
    for (const order of orders) {
      const agg = clientAgg.get(order.clientId) ?? {
        id: order.clientId,
        name: order.client.name,
        orders: 0,
        total: 0,
      }
      agg.orders += 1
      agg.total += Number(order.totalAmount)
      clientAgg.set(order.clientId, agg)
    }
    const servicesByClient = new Map<string, Map<string, ServiceAgg>>()
    for (const item of orderServices) {
      const perClient = servicesByClient.get(item.order.clientId) ?? new Map<string, ServiceAgg>()
      const agg = perClient.get(item.serviceName) ?? { name: item.serviceName, quantity: 0, total: 0 }
      agg.quantity += item.quantity
      agg.total += Number(item.price) * item.quantity
      perClient.set(item.serviceName, agg)
      servicesByClient.set(item.order.clientId, perClient)
    }
    const topClients = sortDesc(
      Array.from(clientAgg.values()),
      (c) => c.orders,
      (c) => c.total,
      (c) => c.name
    )
      .slice(0, 5)
      .map((c) => ({
        ...c,
        topServices: sortDesc(
          Array.from(servicesByClient.get(c.id)?.values() ?? []),
          (s) => s.quantity,
          (s) => s.total,
          (s) => s.name
        )
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
