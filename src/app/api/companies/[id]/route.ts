import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { companySchema } from '@/lib/validations'

// GET /api/companies/[id] - Buscar empresa por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        stores: true,
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
          select: { stores: true, users: true },
        },
      },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(company)
  } catch (error) {
    console.error('Erro ao buscar empresa:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar empresa' },
      { status: 500 }
    )
  }
}

// PUT /api/companies/[id] - Atualizar empresa
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = companySchema.partial().parse(body)

    const existingCompany = await prisma.company.findUnique({
      where: { id },
    })

    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      )
    }

    // Verificar CNPJ/email duplicado
    if (validatedData.cnpj || validatedData.email) {
      const duplicate = await prisma.company.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                validatedData.cnpj ? { cnpj: validatedData.cnpj } : {},
                validatedData.email ? { email: validatedData.email } : {},
              ].filter((obj) => Object.keys(obj).length > 0),
            },
          ],
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Já existe uma empresa com este CNPJ ou email' },
          { status: 400 }
        )
      }
    }

    const company = await prisma.company.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json(company)
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar empresa' },
      { status: 500 }
    )
  }
}

// DELETE /api/companies/[id] - Deletar empresa
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingCompany = await prisma.company.findUnique({
      where: { id },
    })

    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      )
    }

    await prisma.company.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Empresa deletada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar empresa:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar empresa' },
      { status: 500 }
    )
  }
}
