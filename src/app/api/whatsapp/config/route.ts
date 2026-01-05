import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { whatsappConfigSchema, defaultTemplates } from '@/lib/validations'
import { requireRoles } from '@/lib/auth-utils'
import type { OrderStatus } from '@prisma/client'

// GET /api/whatsapp/config - Buscar configuração WhatsApp da company do usuário
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId') || user!.companyId

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar permissão
    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const config = await prisma.whatsAppConfig.findUnique({
      where: { companyId },
      include: {
        templates: {
          orderBy: { triggerStatus: 'asc' },
        },
        _count: {
          select: { messageLogs: true },
        },
      },
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('Erro ao buscar configuração WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar configuração' },
      { status: 500 }
    )
  }
}

// POST /api/whatsapp/config - Criar configuração WhatsApp
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const body = await request.json()
    console.log('[WhatsApp Config] Body recebido:', JSON.stringify(body, null, 2))

    const validatedData = whatsappConfigSchema.parse(body)
    console.log('[WhatsApp Config] Dados validados:', JSON.stringify(validatedData, null, 2))

    // Verificar permissão
    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== validatedData.companyId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Verificar se já existe config para esta company
    const existingConfig = await prisma.whatsAppConfig.findUnique({
      where: { companyId: validatedData.companyId },
    })

    if (existingConfig) {
      return NextResponse.json(
        { error: 'Já existe uma configuração WhatsApp para esta empresa' },
        { status: 400 }
      )
    }

    // Verificar se a company existe
    const company = await prisma.company.findUnique({
      where: { id: validatedData.companyId },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      )
    }

    // Criar config com templates padrão
    const config = await prisma.whatsAppConfig.create({
      data: {
        instanceName: validatedData.instanceName,
        apiKey: validatedData.apiKey,
        apiUrl: validatedData.apiUrl,
        companyId: validatedData.companyId,
        templates: {
          create: Object.entries(defaultTemplates).map(([status, template]) => ({
            name: template.name,
            description: template.description,
            triggerStatus: status as OrderStatus,
            content: template.content,
            isActive: true,
            isDefault: true,
          })),
        },
      },
      include: {
        templates: true,
      },
    })

    return NextResponse.json(config, { status: 201 })
  } catch (error) {
    console.error('[WhatsApp Config] Erro completo:', error)
    if (error && typeof error === 'object' && 'issues' in error) {
      // ZodError
      console.error('[WhatsApp Config] Erro de validação Zod:', JSON.stringify((error as { issues: unknown[] }).issues, null, 2))
      return NextResponse.json(
        { error: 'Dados inválidos', details: (error as { issues: unknown[] }).issues },
        { status: 400 }
      )
    }
    // Erro do Prisma ou outro
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[WhatsApp Config] Mensagem de erro:', errorMessage)
    return NextResponse.json(
      { error: 'Erro ao criar configuração', details: errorMessage },
      { status: 500 }
    )
  }
}

// PUT /api/whatsapp/config - Atualizar configuração WhatsApp
export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID da configuração é obrigatório' },
        { status: 400 }
      )
    }

    const existingConfig = await prisma.whatsAppConfig.findUnique({
      where: { id },
    })

    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissão
    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== existingConfig.companyId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const config = await prisma.whatsAppConfig.update({
      where: { id },
      data: {
        instanceName: data.instanceName,
        apiKey: data.apiKey,
        apiUrl: data.apiUrl,
      },
      include: {
        templates: true,
        _count: {
          select: { messageLogs: true },
        },
      },
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('Erro ao atualizar configuração WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar configuração' },
      { status: 500 }
    )
  }
}

// DELETE /api/whatsapp/config - Deletar configuração WhatsApp
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID da configuração é obrigatório' },
        { status: 400 }
      )
    }

    const existingConfig = await prisma.whatsAppConfig.findUnique({
      where: { id },
    })

    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissão
    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== existingConfig.companyId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    await prisma.whatsAppConfig.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Configuração deletada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar configuração WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar configuração' },
      { status: 500 }
    )
  }
}
