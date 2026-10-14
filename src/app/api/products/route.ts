import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { productSchema } from '@/lib/validations'
import { requireAuth } from '@/lib/auth-utils'
import { productScopeWhere } from '@/lib/products/scope'

// GET /api/products - Listar produtos
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const storeId = searchParams.get('storeId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = productScopeWhere(user!, storeId)

    if (['1', 'true'].includes(searchParams.get('active') ?? '')) where.isActive = true

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
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
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erro ao listar produtos:', error)
    return NextResponse.json(
      { error: 'Erro ao listar produtos' },
      { status: 500 }
    )
  }
}

// POST /api/products - Criar produto
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const body = await request.json()
    const validatedData = productSchema.parse(body)

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
        { error: 'Você não tem permissão para criar produtos nesta loja' },
        { status: 403 }
      )
    }

    if (['MANAGER', 'EMPLOYEE'].includes(user!.role) && user!.storeId !== validatedData.storeId) {
      return NextResponse.json(
        { error: 'Você só pode criar produtos na sua própria loja' },
        { status: 403 }
      )
    }

    const product = await prisma.product.create({
      data: { ...validatedData, description: validatedData.description || null },
      include: {
        store: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao criar produto' },
      { status: 500 }
    )
  }
}
