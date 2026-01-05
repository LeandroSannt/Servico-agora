import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Sua conta está desativada. Entre em contato com o administrador.' },
        { status: 403 }
      )
    }

    // Verificar se a empresa está ativa (SUPER_ADMIN não tem empresa)
    if (user.company && !user.company.isActive) {
      return NextResponse.json(
        { error: 'Sua empresa está inativa. Entre em contato com o administrador.' },
        { status: 403 }
      )
    }

    // Verificar se a loja está ativa (SUPER_ADMIN e COMPANY_ADMIN não têm loja obrigatória)
    if (user.store && !user.store.isActive) {
      return NextResponse.json(
        { error: 'Sua loja está inativa. Entre em contato com o administrador.' },
        { status: 403 }
      )
    }

    // Credenciais válidas - retorna sucesso
    // A sessão será criada pelo NextAuth signIn no frontend
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor. Tente novamente.' },
      { status: 500 }
    )
  }
}
