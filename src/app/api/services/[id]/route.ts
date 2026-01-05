import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { serviceSchema } from '@/lib/validations'

// GET /api/services/[id] - Buscar serviço por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        store: true,
      },
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(service)
  } catch (error) {
    console.error('Erro ao buscar serviço:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar serviço' },
      { status: 500 }
    )
  }
}

// PUT /api/services/[id] - Atualizar serviço
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = serviceSchema.partial().parse(body)

    const existingService = await prisma.service.findUnique({
      where: { id },
    })

    if (!existingService) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 }
      )
    }

    const service = await prisma.service.update({
      where: { id },
      data: validatedData,
      include: {
        store: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(service)
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar serviço' },
      { status: 500 }
    )
  }
}

// DELETE /api/services/[id] - Deletar serviço (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingService = await prisma.service.findUnique({
      where: { id },
    })

    if (!existingService) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 }
      )
    }

    // Soft delete - apenas desativa
    await prisma.service.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Serviço desativado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar serviço:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar serviço' },
      { status: 500 }
    )
  }
}
