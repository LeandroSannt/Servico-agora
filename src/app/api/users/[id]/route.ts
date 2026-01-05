import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { userUpdateSchema } from '@/lib/validations'
import { requireRoles, getCompanyFilter } from '@/lib/auth-utils'
import bcrypt from 'bcryptjs'

// GET /api/users/[id] - Buscar usuário por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: authUser, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const { id } = await params
    const companyFilter = getCompanyFilter(authUser!)

    const user = await prisma.user.findFirst({
      where: { id, ...companyFilter },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        company: true,
        store: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar usuário' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id] - Atualizar usuário
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: authUser, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const validatedData = userUpdateSchema.parse(body)

    const companyFilter = getCompanyFilter(authUser!)
    const existingUser = await prisma.user.findFirst({
      where: { id, ...companyFilter },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // COMPANY_ADMIN não pode editar SUPER_ADMIN ou promover para SUPER_ADMIN
    if (authUser!.role === 'COMPANY_ADMIN') {
      if (existingUser.role === 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Você não tem permissão para editar este usuário' },
          { status: 403 }
        )
      }
      if (validatedData.role === 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Você não tem permissão para definir este cargo' },
          { status: 403 }
        )
      }
    }

    // Verificar email duplicado
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const duplicate = await prisma.user.findUnique({
        where: { email: validatedData.email },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Já existe um usuário com este email' },
          { status: 400 }
        )
      }
    }

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = { ...validatedData }

    // Se tem senha, fazer hash
    if (updateData.password && typeof updateData.password === 'string') {
      updateData.password = await bcrypt.hash(updateData.password, 10)
    } else {
      delete updateData.password
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        company: {
          select: { id: true, name: true },
        },
        store: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar usuário' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Deletar usuário
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: authUser, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const { id } = await params
    const companyFilter = getCompanyFilter(authUser!)

    const existingUser = await prisma.user.findFirst({
      where: { id, ...companyFilter },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Não pode deletar a si mesmo
    if (existingUser.id === authUser!.id) {
      return NextResponse.json(
        { error: 'Você não pode excluir sua própria conta' },
        { status: 400 }
      )
    }

    // COMPANY_ADMIN não pode deletar SUPER_ADMIN
    if (authUser!.role === 'COMPANY_ADMIN' && existingUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Você não tem permissão para excluir este usuário' },
        { status: 403 }
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Usuário deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar usuário' },
      { status: 500 }
    )
  }
}
