import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { serviceSchema } from '@/lib/validations'
import { requireAuth, getCompanyFilter, getStoreFilter } from '@/lib/auth-utils'

// GET /api/services - Listar serviços
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const storeId = searchParams.get('storeId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Construir filtro baseado no role do usuário
    const storeFilter = getStoreFilter(user!)
    const where: Record<string, unknown> = { ...storeFilter }

    // Se SUPER_ADMIN ou COMPANY_ADMIN, filtra por company
    if (['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(user!.role)) {
      const companyFilter = getCompanyFilter(user!)
      if (companyFilter.companyId) {
        where.store = { companyId: companyFilter.companyId }
      }
    }

    if (storeId) {
      if (user!.role === 'SUPER_ADMIN' || user!.role === 'COMPANY_ADMIN' || user!.storeId === storeId) {
        where.storeId = storeId
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          store: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.service.count({ where }),
    ])

    return NextResponse.json({
      data: services,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erro ao listar serviços:', error)
    return NextResponse.json(
      { error: 'Erro ao listar serviços' },
      { status: 500 }
    )
  }
}

// POST /api/services - Criar serviço
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const body = await request.json()
    const validatedData = serviceSchema.parse(body)

    // Verificar se a loja existe
    const store = await prisma.store.findUnique({
      where: { id: validatedData.storeId },
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissão
    if (user!.role === 'COMPANY_ADMIN' && store.companyId !== user!.companyId) {
      return NextResponse.json(
        { error: 'Você não tem permissão para criar serviços nesta loja' },
        { status: 403 }
      )
    }

    if (['MANAGER', 'EMPLOYEE'].includes(user!.role) && user!.storeId !== validatedData.storeId) {
      return NextResponse.json(
        { error: 'Você só pode criar serviços na sua própria loja' },
        { status: 403 }
      )
    }

    const service = await prisma.service.create({
      data: validatedData,
      include: {
        store: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar serviço:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao criar serviço' },
      { status: 500 }
    )
  }
}
