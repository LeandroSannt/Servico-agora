import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { OrderStatus, WhatsAppConfig, WhatsAppProviderType } from '@prisma/client'
import prisma from '@/lib/prisma'
import {
  whatsappConfigSchema,
  whatsappConfigUpdateSchema,
  defaultTemplates,
  TEMPLATE_TRIGGER_STATUSES,
} from '@/lib/validations/whatsapp'
import { requireRoles } from '@/lib/auth-utils'
import { checkWhatsAppConnection, metaTemplateName } from '@/lib/whatsapp'
import { isMetaMock } from '@/lib/whatsapp/resolve-provider'

// Nunca devolve segredos ao cliente
function sanitizeConfig<T extends WhatsAppConfig>(config: T) {
  const { metaAccessToken, apiKey, ...rest } = config
  return {
    ...rest,
    hasMetaAccessToken: !!metaAccessToken,
    metaAccessTokenHint: metaAccessToken ? metaAccessToken.slice(-4) : null,
    hasApiKey: !!apiKey,
  }
}

const configInclude = {
  templates: { orderBy: { triggerStatus: 'asc' as const } },
  _count: { select: { messageLogs: true } },
}

function forbidden() {
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
}

// Garante os 5 templates padrão e, para Meta, o nome do template na Meta
async function ensureTemplates(configId: string, companyId: string, provider: WhatsAppProviderType) {
  const existing = await prisma.messageTemplate.findMany({ where: { whatsappConfigId: configId } })
  const byStatus = new Map(existing.map((t) => [t.triggerStatus, t]))

  for (const status of TEMPLATE_TRIGGER_STATUSES) {
    const template = byStatus.get(status as OrderStatus)
    if (!template) {
      const def = defaultTemplates[status]
      await prisma.messageTemplate.create({
        data: {
          name: def.name,
          description: def.description,
          triggerStatus: status,
          content: def.content,
          isActive: true,
          isDefault: true,
          whatsappConfigId: configId,
          metaTemplateName: provider === 'META' ? metaTemplateName(status, companyId) : null,
          metaStatus: 'NOT_CREATED',
        },
      })
    } else if (provider === 'META' && !template.metaTemplateName) {
      await prisma.messageTemplate.update({
        where: { id: template.id },
        data: { metaTemplateName: metaTemplateName(status, companyId), metaStatus: 'NOT_CREATED' },
      })
    }
  }
}

async function loadConfig(id: string) {
  return prisma.whatsAppConfig.findUnique({ where: { id }, include: configInclude })
}

// GET /api/whatsapp/config - Buscar configuração WhatsApp da company do usuário
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId') || user!.companyId

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID é obrigatório' }, { status: 400 })
    }
    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== companyId) return forbidden()

    const config = await prisma.whatsAppConfig.findUnique({ where: { companyId }, include: configInclude })
    if (!config) return NextResponse.json(null)

    return NextResponse.json({ ...sanitizeConfig(config), mock: isMetaMock() })
  } catch (error) {
    console.error('Erro ao buscar configuração WhatsApp:', error)
    return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 })
  }
}

// POST /api/whatsapp/config - Criar configuração WhatsApp
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const body = await request.json()
    const data = whatsappConfigSchema.parse(body)

    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== data.companyId) return forbidden()

    const existingConfig = await prisma.whatsAppConfig.findUnique({ where: { companyId: data.companyId } })
    if (existingConfig) {
      return NextResponse.json({ error: 'Já existe uma configuração WhatsApp para esta empresa' }, { status: 400 })
    }

    const company = await prisma.company.findUnique({ where: { id: data.companyId } })
    if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

    const created = await prisma.whatsAppConfig.create({
      data:
        data.provider === 'META'
          ? {
              provider: 'META',
              companyId: data.companyId,
              metaPhoneNumberId: data.metaPhoneNumberId,
              metaWabaId: data.metaWabaId,
              metaAccessToken: data.metaAccessToken,
              metaAppId: data.metaAppId || null,
              ...(data.apiUrl ? { apiUrl: data.apiUrl } : {}),
            }
          : {
              provider: 'EVOLUTION',
              companyId: data.companyId,
              instanceName: data.instanceName,
              apiKey: data.apiKey,
              apiUrl: data.apiUrl,
            },
    })

    await ensureTemplates(created.id, created.companyId, created.provider)
    if (created.provider === 'META') await checkWhatsAppConnection(created.companyId)

    const config = await loadConfig(created.id)
    return NextResponse.json({ ...sanitizeConfig(config!), mock: isMetaMock() }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.issues }, { status: 400 })
    }
    console.error('[WhatsApp Config] Erro ao criar:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: 'Erro ao criar configuração', details: errorMessage }, { status: 500 })
  }
}

// PUT /api/whatsapp/config - Atualizar configuração WhatsApp
export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const body = await request.json()
    const { id, ...rest } = body as { id?: string } & Record<string, unknown>
    if (!id) return NextResponse.json({ error: 'ID da configuração é obrigatório' }, { status: 400 })

    const existingConfig = await prisma.whatsAppConfig.findUnique({ where: { id } })
    if (!existingConfig) return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== existingConfig.companyId) return forbidden()

    const data = whatsappConfigUpdateSchema.parse(rest)
    const providerChanged = data.provider !== existingConfig.provider

    if (data.provider === 'META') {
      const token = data.metaAccessToken || existingConfig.metaAccessToken
      if (!token) return NextResponse.json({ error: 'Token de acesso é obrigatório' }, { status: 400 })

      await prisma.whatsAppConfig.update({
        where: { id },
        data: {
          provider: 'META',
          metaPhoneNumberId: data.metaPhoneNumberId,
          metaWabaId: data.metaWabaId,
          metaAccessToken: token,
          metaAppId: data.metaAppId || null,
          ...(data.apiUrl ? { apiUrl: data.apiUrl } : {}),
          ...(providerChanged ? { isConnected: false, phoneNumber: null } : {}),
        },
      })
      await ensureTemplates(id, existingConfig.companyId, 'META')
      await checkWhatsAppConnection(existingConfig.companyId)
    } else {
      const apiKey = data.apiKey || existingConfig.apiKey
      if (!apiKey) return NextResponse.json({ error: 'API Key é obrigatória' }, { status: 400 })

      await prisma.whatsAppConfig.update({
        where: { id },
        data: {
          provider: 'EVOLUTION',
          instanceName: data.instanceName,
          apiKey,
          apiUrl: data.apiUrl,
          ...(providerChanged ? { isConnected: false, phoneNumber: null } : {}),
        },
      })
      await ensureTemplates(id, existingConfig.companyId, 'EVOLUTION')
    }

    const config = await loadConfig(id)
    return NextResponse.json({ ...sanitizeConfig(config!), mock: isMetaMock() })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.issues }, { status: 400 })
    }
    console.error('Erro ao atualizar configuração WhatsApp:', error)
    return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 })
  }
}

// DELETE /api/whatsapp/config - Deletar configuração WhatsApp
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID da configuração é obrigatório' }, { status: 400 })

    const existingConfig = await prisma.whatsAppConfig.findUnique({ where: { id } })
    if (!existingConfig) return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 })
    if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== existingConfig.companyId) return forbidden()

    await prisma.whatsAppConfig.delete({ where: { id } })
    return NextResponse.json({ message: 'Configuração deletada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar configuração WhatsApp:', error)
    return NextResponse.json({ error: 'Erro ao deletar configuração' }, { status: 500 })
  }
}
