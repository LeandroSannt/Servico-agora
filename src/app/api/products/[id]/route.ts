import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { productSchema } from '@/lib/validations'
import { requireAuth, type AuthUser } from '@/lib/auth-utils'

// Acesso por loja: mesma regra usada na criação (empresa do admin ou loja do usuário)
function canAccessStore(user: AuthUser, store: { id: string; companyId: string }) {
  if (user.role === 'SUPER_ADMIN') return true
  if (user.role === 'COMPANY_ADMIN') return store.companyId === user.companyId
  return user.storeId === store.id
}

const forbidden = () => NextResponse.json({ error: 'Sem permissão para este produto' }, { status: 403 })
const notFound = () => NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

// GET /api/products/[id] - Buscar produto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      include: { store: true },
    })
    if (!product) return notFound()
    if (!canAccessStore(user!, product.store)) return forbidden()

    return NextResponse.json(product)
  } catch (error) {
    console.error('Erro ao buscar produto:', error)
    return NextResponse.json({ error: 'Erro ao buscar produto' }, { status: 500 })
  }
}

// PUT /api/products/[id] - Atualizar produto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error
    const { id } = await params
    const body = await request.json()
    // A loja de um produto não muda (OS já vinculadas pertencem à loja)
    const { storeId: _ignored, ...validatedData } = productSchema.partial().parse(body)
    void _ignored

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { store: { select: { id: true, companyId: true } } },
    })
    if (!existing) return notFound()
    if (!canAccessStore(user!, existing.store)) return forbidden()

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...validatedData,
        ...(validatedData.description !== undefined && { description: validatedData.description || null }),
      },
      include: { store: { select: { id: true, name: true } } },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Erro ao atualizar produto:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Dados inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 })
  }
}

// DELETE /api/products/[id] - Apaga; se já usado em OS, apenas desativa
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error
    const { id } = await params

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { store: { select: { id: true, companyId: true } } },
    })
    if (!existing) return notFound()
    if (!canAccessStore(user!, existing.store)) return forbidden()

    const used = await prisma.orderProduct.count({ where: { productId: id } })
    if (used > 0) {
      await prisma.product.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({ archived: true })
    }

    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ archived: false })
  } catch (error) {
    console.error('Erro ao remover produto:', error)
    return NextResponse.json({ error: 'Erro ao remover produto' }, { status: 500 })
  }
}
