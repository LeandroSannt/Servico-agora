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

    const [ordersReceived, ordersInProgress, ordersPaused, ordersFinished, ordersPaid, totalClients, revenueFinished, revenuePaid] = await Promise.all([
      prisma.serviceOrder.count({ where: { ...orderWhere, status: 'RECEIVED' } }),
      prisma.serviceOrder.count({ where: { ...orderWhere, status: 'IN_PROGRESS' } }),
      prisma.serviceOrder.count({ where: { ...orderWhere, status: 'PAUSED' } }),
      prisma.serviceOrder.count({ where: { ...orderWhere, status: 'FINISHED' } }),
      prisma.serviceOrder.count({ where: { ...orderWhere, status: 'PAID' } }),
      prisma.client.count({ where: clientWhere }),
      // Total de OS finalizadas (aguardando pagamento)
      prisma.serviceOrder.aggregate({
        where: { ...orderWhere, status: 'FINISHED' },
        _sum: { totalAmount: true },
      }),
      // Total de OS pagas (receita confirmada)
      prisma.serviceOrder.aggregate({
        where: { ...orderWhere, status: 'PAID' },
        _sum: { totalAmount: true },
      }),
    ])

    return NextResponse.json({
      ordersReceived,
      ordersInProgress,
      ordersPaused,
      ordersFinished,
      ordersPaid,
      totalClients,
      // Total finalizadas = aguardando pagamento
      totalPending: revenueFinished._sum.totalAmount || 0,
      // Total pago = receita confirmada
      totalPaid: revenuePaid._sum.totalAmount || 0,
      // Total geral (finalizadas + pagas)
      totalRevenue: Number(revenueFinished._sum.totalAmount || 0) + Number(revenuePaid._sum.totalAmount || 0),
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}
