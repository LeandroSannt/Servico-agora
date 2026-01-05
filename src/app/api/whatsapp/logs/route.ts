import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRoles } from '@/lib/auth-utils'

// GET /api/whatsapp/logs - Listar logs de mensagens
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId') || user!.companyId
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar permissão
    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Buscar config da company
    const config = await prisma.whatsAppConfig.findUnique({
      where: { companyId },
    })

    if (!config) {
      return NextResponse.json({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        stats: { total: 0, sent: 0, delivered: 0, failed: 0 },
      })
    }

    // Construir filtro
    const where: Record<string, unknown> = { whatsappConfigId: config.id }
    if (status) {
      where.status = status
    }

    // Buscar logs
    const [logs, total, stats] = await Promise.all([
      prisma.messageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.messageLog.count({ where }),
      prisma.messageLog.groupBy({
        by: ['status'],
        where: { whatsappConfigId: config.id },
        _count: { status: true },
      }),
    ])

    // Formatar estatísticas
    const statsFormatted = {
      total: 0,
      pending: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    }

    stats.forEach((s) => {
      const key = s.status.toLowerCase() as keyof typeof statsFormatted
      statsFormatted[key] = s._count.status
      statsFormatted.total += s._count.status
    })

    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: statsFormatted,
    })
  } catch (error) {
    console.error('Erro ao listar logs:', error)
    return NextResponse.json(
      { error: 'Erro ao listar logs' },
      { status: 500 }
    )
  }
}
