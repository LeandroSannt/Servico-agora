import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { storeSchema } from '@/lib/validations'
import { requireAuth, requireRoles, getCompanyFilter } from '@/lib/auth-utils'

// GET /api/stores - Listar lojas
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const companyId = searchParams.get('companyId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Filtro base por company do usuário
    const companyFilter = getCompanyFilter(user!)
    const where: Record<string, unknown> = { ...companyFilter }

    // Se passou companyId específico, usar (respeitando permissão)
    if (companyId) {
      if (user!.role === 'SUPER_ADMIN' || user!.companyId === companyId) {
        where.companyId = companyId
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        include: {
          company: {
            select: { id: true, name: true },
          },
          _count: {
            select: { users: true, clients: true, services: true, serviceOrders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.store.count({ where }),
    ])

    return NextResponse.json({
      data: stores,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erro ao listar lojas:', error)
    return NextResponse.json(
      { error: 'Erro ao listar lojas' },
      { status: 500 }
    )
  }
}

// POST /api/stores - Criar loja (apenas SUPER_ADMIN e COMPANY_ADMIN)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const body = await request.json()
    const validatedData = storeSchema.parse(body)

    // COMPANY_ADMIN só pode criar lojas na própria company
    if (user!.role === 'COMPANY_ADMIN' && validatedData.companyId !== user!.companyId) {
      return NextResponse.json(
        { error: 'Você só pode criar lojas na sua própria empresa' },
        { status: 403 }
      )
    }

    const company = await prisma.company.findUnique({
      where: { id: validatedData.companyId },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      )
    }

    const store = await prisma.store.create({
      data: validatedData,
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(store, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar loja:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao criar loja' },
      { status: 500 }
    )
  }
}
