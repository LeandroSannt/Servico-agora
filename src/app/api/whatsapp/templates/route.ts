import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { messageTemplateSchema } from '@/lib/validations'
import { requireRoles } from '@/lib/auth-utils'

// GET /api/whatsapp/templates - Listar templates
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const whatsappConfigId = searchParams.get('configId')

    if (!whatsappConfigId) {
      return NextResponse.json(
        { error: 'Config ID é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar permissão
    const config = await prisma.whatsAppConfig.findUnique({
      where: { id: whatsappConfigId },
    })

    if (!config) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      )
    }

    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== config.companyId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const templates = await prisma.messageTemplate.findMany({
      where: { whatsappConfigId },
      orderBy: { triggerStatus: 'asc' },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Erro ao listar templates:', error)
    return NextResponse.json(
      { error: 'Erro ao listar templates' },
      { status: 500 }
    )
  }
}

// POST /api/whatsapp/templates - Criar template
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const body = await request.json()
    const validatedData = messageTemplateSchema.parse(body)

    // Verificar permissão
    const config = await prisma.whatsAppConfig.findUnique({
      where: { id: validatedData.whatsappConfigId },
    })

    if (!config) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      )
    }

    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== config.companyId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const template = await prisma.messageTemplate.create({
      data: validatedData,
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar template:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao criar template' },
      { status: 500 }
    )
  }
}

// PUT /api/whatsapp/templates - Atualizar template
export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID do template é obrigatório' },
        { status: 400 }
      )
    }

    const existingTemplate = await prisma.messageTemplate.findUnique({
      where: { id },
      include: { whatsappConfig: true },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissão
    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== existingTemplate.whatsappConfig.companyId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        triggerStatus: data.triggerStatus,
        content: data.content,
        isActive: data.isActive,
      },
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Erro ao atualizar template:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar template' },
      { status: 500 }
    )
  }
}

// DELETE /api/whatsapp/templates - Deletar template
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID do template é obrigatório' },
        { status: 400 }
      )
    }

    const existingTemplate = await prisma.messageTemplate.findUnique({
      where: { id },
      include: { whatsappConfig: true },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissão
    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== existingTemplate.whatsappConfig.companyId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Não permitir deletar templates padrão
    if (existingTemplate.isDefault) {
      return NextResponse.json(
        { error: 'Não é possível deletar templates padrão. Desative-o ao invés disso.' },
        { status: 400 }
      )
    }

    await prisma.messageTemplate.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Template deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar template:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar template' },
      { status: 500 }
    )
  }
}
