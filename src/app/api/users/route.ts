import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { userSchema } from '@/lib/validations'
import { requireRoles, getCompanyFilter } from '@/lib/auth-utils'
import bcrypt from 'bcryptjs'
import { sendEmail, welcomeEmailTemplate } from '@/lib/email'

// GET /api/users - Listar usuários
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const companyId = searchParams.get('companyId')
    const storeId = searchParams.get('storeId')
    const role = searchParams.get('role')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Filtro base por company do usuário
    const companyFilter = getCompanyFilter(user!)
    const where: Record<string, unknown> = { ...companyFilter }

    if (companyId) {
      if (user!.role === 'SUPER_ADMIN' || user!.companyId === companyId) {
        where.companyId = companyId
      }
    }

    if (storeId) {
      where.storeId = storeId
    }

    if (role) {
      where.role = role
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json(
      { error: 'Erro ao listar usuários' },
      { status: 500 }
    )
  }
}

// POST /api/users - Criar usuário
export async function POST(request: NextRequest) {
  try {
    const { user: authUser, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const body = await request.json()
    const validatedData = userSchema.parse(body)

    // COMPANY_ADMIN só pode criar usuários na própria company
    if (authUser!.role === 'COMPANY_ADMIN') {
      if (validatedData.companyId && validatedData.companyId !== authUser!.companyId) {
        return NextResponse.json(
          { error: 'Você só pode criar usuários na sua própria empresa' },
          { status: 403 }
        )
      }
      // Força a company do admin
      validatedData.companyId = authUser!.companyId || undefined

      // COMPANY_ADMIN não pode criar SUPER_ADMIN
      if (validatedData.role === 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Você não tem permissão para criar usuários Super Admin' },
          { status: 403 }
        )
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Já existe um usuário com este email' },
        { status: 400 }
      )
    }

    // Validar empresa e loja se necessário
    if (validatedData.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: validatedData.companyId },
      })
      if (!company) {
        return NextResponse.json(
          { error: 'Empresa não encontrada' },
          { status: 404 }
        )
      }
    }

    if (validatedData.storeId) {
      const store = await prisma.store.findUnique({
        where: { id: validatedData.storeId },
      })
      if (!store) {
        return NextResponse.json(
          { error: 'Loja não encontrada' },
          { status: 404 }
        )
      }
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Guardar a senha original antes do hash para enviar por email
    const originalPassword = validatedData.password

    const newUser = await prisma.user.create({
      data: {
        ...validatedData,
        password: hashedPassword,
      },
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

    // Enviar email de boas-vindas com a senha
    try {
      const template = welcomeEmailTemplate(newUser.name, newUser.email, originalPassword)
      await sendEmail({
        to: newUser.email,
        subject: template.subject,
        html: template.html,
      })
    } catch (emailError) {
      console.error('Erro ao enviar email de boas-vindas:', emailError)
      // Não falha a criação do usuário se o email não for enviado
    }

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao criar usuário' },
      { status: 500 }
    )
  }
}
