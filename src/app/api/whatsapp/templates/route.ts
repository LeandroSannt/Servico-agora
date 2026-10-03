import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { messageTemplateSchema, defaultTemplates } from '@/lib/validations/whatsapp'
import { requireRoles } from '@/lib/auth-utils'

const MIN_CONTENT = 'Conteúdo deve ter pelo menos 10 caracteres'

function forbidden() {
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
}

// GET /api/whatsapp/templates?configId= - Listar templates
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const whatsappConfigId = searchParams.get('configId')
    if (!whatsappConfigId) return NextResponse.json({ error: 'Config ID é obrigatório' }, { status: 400 })

    const config = await prisma.whatsAppConfig.findUnique({ where: { id: whatsappConfigId } })
    if (!config) return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== config.companyId) return forbidden()

    const templates = await prisma.messageTemplate.findMany({
      where: { whatsappConfigId },
      orderBy: { triggerStatus: 'asc' },
    })
    return NextResponse.json(templates)
  } catch (error) {
    console.error('Erro ao listar templates:', error)
    return NextResponse.json({ error: 'Erro ao listar templates' }, { status: 500 })
  }
}

// POST /api/whatsapp/templates - Criar template
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const body = await request.json()
    const validated = messageTemplateSchema.parse(body)

    const config = await prisma.whatsAppConfig.findUnique({ where: { id: validated.whatsappConfigId } })
    if (!config) return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== config.companyId) return forbidden()

    const { content, ...rest } = validated
    if (config.provider === 'EVOLUTION' && (!content || content.length < 10)) {
      return NextResponse.json({ error: MIN_CONTENT }, { status: 400 })
    }

    const template = await prisma.messageTemplate.create({
      data: {
        ...rest,
        // Prisma exige content; para Meta o texto fica na Meta, então guardamos o padrão como referência
        content: content ?? defaultTemplates[rest.triggerStatus].content,
        metaStatus: 'NOT_CREATED',
      },
    })
    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.issues }, { status: 400 })
    }
    console.error('Erro ao criar template:', error)
    return NextResponse.json({ error: 'Erro ao criar template' }, { status: 500 })
  }
}

// PUT /api/whatsapp/templates - Atualizar template
export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const body = await request.json()
    const { id, ...rest } = body as { id?: string } & Record<string, unknown>
    if (!id) return NextResponse.json({ error: 'ID do template é obrigatório' }, { status: 400 })

    const existing = await prisma.messageTemplate.findUnique({ where: { id }, include: { whatsappConfig: true } })
    if (!existing) return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== existing.whatsappConfig.companyId) return forbidden()

    const data = messageTemplateSchema.partial().parse(rest)
    const isMeta = existing.whatsappConfig.provider === 'META'

    if (!isMeta && data.content !== undefined && data.content.length < 10) {
      return NextResponse.json({ error: MIN_CONTENT }, { status: 400 })
    }

    const nameChanged = isMeta && data.metaTemplateName !== undefined && data.metaTemplateName !== existing.metaTemplateName

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        triggerStatus: data.triggerStatus,
        isActive: data.isActive,
        // Meta: o texto é editado no Business Manager, não aqui
        ...(isMeta ? {} : { content: data.content }),
        ...(isMeta
          ? {
              metaTemplateName: data.metaTemplateName,
              metaLanguage: data.metaLanguage,
              ...(nameChanged ? { metaStatus: 'NOT_CREATED' as const, metaRejectReason: null } : {}),
            }
          : {}),
      },
    })
    return NextResponse.json(template)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.issues }, { status: 400 })
    }
    console.error('Erro ao atualizar template:', error)
    return NextResponse.json({ error: 'Erro ao atualizar template' }, { status: 500 })
  }
}

// DELETE /api/whatsapp/templates?id= - Deletar template
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID do template é obrigatório' }, { status: 400 })

    const existing = await prisma.messageTemplate.findUnique({ where: { id }, include: { whatsappConfig: true } })
    if (!existing) return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== existing.whatsappConfig.companyId) return forbidden()

    if (existing.isDefault) {
      return NextResponse.json(
        { error: 'Não é possível deletar templates padrão. Desative-o ao invés disso.' },
        { status: 400 }
      )
    }

    await prisma.messageTemplate.delete({ where: { id } })
    return NextResponse.json({ message: 'Template deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar template:', error)
    return NextResponse.json({ error: 'Erro ao deletar template' }, { status: 500 })
  }
}
