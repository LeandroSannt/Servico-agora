import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { companySchema } from '@/lib/validations'
import { requireRoles } from '@/lib/auth-utils'
import { InvalidLogoError } from '@/lib/company-logo'
import { logoUpdateData, toPublicCompany } from '@/lib/company-logo-data'

// GET /api/companies - Listar empresas
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireRoles(['SUPER_ADMIN'])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          _count: {
            select: { stores: true, users: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.company.count({ where }),
    ])

    return NextResponse.json({
      data: companies.map(toPublicCompany),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erro ao listar empresas:', error)
    return NextResponse.json(
      { error: 'Erro ao listar empresas' },
      { status: 500 }
    )
  }
}

// POST /api/companies - Criar empresa
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireRoles(['SUPER_ADMIN'])
    if (error) return error

    const body = await request.json()
    const { logo, ...validatedData } = companySchema.parse(body)

    const existingCompany = await prisma.company.findFirst({
      where: {
        OR: [
          { cnpj: validatedData.cnpj },
          { email: validatedData.email },
        ],
      },
    })

    if (existingCompany) {
      return NextResponse.json(
        { error: 'Já existe uma empresa com este CNPJ ou email' },
        { status: 400 }
      )
    }

    const company = await prisma.company.create({
      data: {
        ...validatedData,
        ...logoUpdateData(logo),
      },
    })

    return NextResponse.json(toPublicCompany(company), { status: 201 })
  } catch (error) {
    console.error('Erro ao criar empresa:', error)
    if (error instanceof InvalidLogoError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.name === 'ZodError') {
      const issues = (error as { issues?: { path: (string | number)[]; message: string }[] }).issues
      const logoIssue = issues?.find((i) => i.path[0] === 'logo')
      return NextResponse.json(
        { error: logoIssue?.message ?? 'Dados inválidos', details: error },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao criar empresa' },
      { status: 500 }
    )
  }
}
