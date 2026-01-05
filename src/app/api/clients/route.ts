import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { clientSchema } from '@/lib/validations'
import { requireAuth, getCompanyFilter, getStoreFilter } from '@/lib/auth-utils'

// GET /api/clients - Listar clientes
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const storeId = searchParams.get('storeId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Construir filtro baseado no role do usuário
    const storeFilter = getStoreFilter(user!)
    const where: Record<string, unknown> = { ...storeFilter }

    // Se SUPER_ADMIN ou COMPANY_ADMIN, pode filtrar por company
    if (['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(user!.role)) {
      const companyFilter = getCompanyFilter(user!)
      if (companyFilter.companyId) {
        where.store = { companyId: companyFilter.companyId }
      }
    }

    // Se passou storeId específico, usar (respeitando permissão)
    if (storeId) {
      if (user!.role === 'SUPER_ADMIN' || user!.role === 'COMPANY_ADMIN' || user!.storeId === storeId) {
        where.storeId = storeId
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { document: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          store: {
            select: { id: true, name: true },
          },
          _count: {
            select: { serviceOrders: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.client.count({ where }),
    ])

    return NextResponse.json({
      data: clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erro ao listar clientes:', error)
    return NextResponse.json(
      { error: 'Erro ao listar clientes' },
      { status: 500 }
    )
  }
}

// POST /api/clients - Criar cliente
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const body = await request.json()
    const validatedData = clientSchema.parse(body)

    // Verificar se a loja existe e se o usuário tem acesso
    const store = await prisma.store.findUnique({
      where: { id: validatedData.storeId },
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissão para criar cliente nesta loja
    if (user!.role === 'COMPANY_ADMIN' && store.companyId !== user!.companyId) {
      return NextResponse.json(
        { error: 'Você não tem permissão para criar clientes nesta loja' },
        { status: 403 }
      )
    }

    if (['MANAGER', 'EMPLOYEE'].includes(user!.role) && user!.storeId !== validatedData.storeId) {
      return NextResponse.json(
        { error: 'Você só pode criar clientes na sua própria loja' },
        { status: 403 }
      )
    }

    const client = await prisma.client.create({
      data: validatedData,
      include: {
        store: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao criar cliente' },
      { status: 500 }
    )
  }
}
