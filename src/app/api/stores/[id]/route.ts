import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { storeSchema } from '@/lib/validations'

// GET /api/stores/[id] - Buscar loja por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        company: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        _count: {
          select: { clients: true, services: true, serviceOrders: true },
        },
      },
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(store)
  } catch (error) {
    console.error('Erro ao buscar loja:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar loja' },
      { status: 500 }
    )
  }
}

// PUT /api/stores/[id] - Atualizar loja
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = storeSchema.partial().parse(body)

    const existingStore = await prisma.store.findUnique({
      where: { id },
    })

    if (!existingStore) {
      return NextResponse.json(
        { error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    const store = await prisma.store.update({
      where: { id },
      data: validatedData,
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(store)
  } catch (error) {
    console.error('Erro ao atualizar loja:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar loja' },
      { status: 500 }
    )
  }
}

// DELETE /api/stores/[id] - Deletar loja
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingStore = await prisma.store.findUnique({
      where: { id },
    })

    if (!existingStore) {
      return NextResponse.json(
        { error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    await prisma.store.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Loja deletada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar loja:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar loja' },
      { status: 500 }
    )
  }
}
