import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRoles } from '@/lib/auth-utils'
import { refreshMetaTemplateStatus, syncMetaTemplates } from '@/lib/whatsapp'

async function resolveMetaConfig(companyIdParam: string | null) {
  const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
  if (error) return { error }

  const companyId = companyIdParam || user!.companyId
  if (!companyId) return { error: NextResponse.json({ error: 'Company ID é obrigatório' }, { status: 400 }) }
  if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== companyId) {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }

  const config = await prisma.whatsAppConfig.findUnique({ where: { companyId } })
  if (!config) return { error: NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 }) }
  if (config.provider !== 'META') {
    return { error: NextResponse.json({ error: 'Sincronização disponível apenas para o provedor Meta' }, { status: 400 }) }
  }
  return { config }
}

// POST /api/whatsapp/templates/sync - Cria na Meta os templates ainda não criados
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const resolved = await resolveMetaConfig(body?.companyId || null)
  if ('error' in resolved) return resolved.error

  try {
    const results = await syncMetaTemplates(resolved.config.id)
    const templates = await prisma.messageTemplate.findMany({
      where: { whatsappConfigId: resolved.config.id },
      orderBy: { triggerStatus: 'asc' },
    })
    return NextResponse.json({ results, templates })
  } catch (error) {
    console.error('[WhatsApp] Erro ao criar templates na Meta:', error)
    return NextResponse.json(
      { error: 'Erro ao criar templates na Meta', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}

// GET /api/whatsapp/templates/sync?companyId= - Atualiza o status dos templates a partir da Meta
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const resolved = await resolveMetaConfig(searchParams.get('companyId'))
  if ('error' in resolved) return resolved.error

  try {
    await refreshMetaTemplateStatus(resolved.config.id)
    const templates = await prisma.messageTemplate.findMany({
      where: { whatsappConfigId: resolved.config.id },
      orderBy: { triggerStatus: 'asc' },
    })
    return NextResponse.json({ templates })
  } catch (error) {
    console.error('[WhatsApp] Erro ao consultar templates na Meta:', error)
    return NextResponse.json(
      { error: 'Erro ao consultar status dos templates', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}
