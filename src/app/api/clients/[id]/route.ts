import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { clientSchema } from '@/lib/validations'

// GET /api/clients/[id] - Buscar cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        store: true,
        serviceOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            services: true,
          },
        },
        _count: {
          select: { serviceOrders: true },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar cliente' },
      { status: 500 }
    )
  }
}

// PUT /api/clients/[id] - Atualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = clientSchema.partial().parse(body)

    const existingClient = await prisma.client.findUnique({
      where: { id },
    })

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    const client = await prisma.client.update({
      where: { id },
      data: validatedData,
      include: {
        store: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar cliente' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id] - Deletar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingClient = await prisma.client.findUnique({
      where: { id },
    })

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    await prisma.client.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Cliente deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar cliente:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar cliente' },
      { status: 500 }
    )
  }
}
