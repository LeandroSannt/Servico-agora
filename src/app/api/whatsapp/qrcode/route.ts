import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRoles } from '@/lib/auth-utils'
import { checkWhatsAppConnection, disconnectWhatsApp, getWhatsAppQRCode } from '@/lib/whatsapp'

const EVOLUTION_ONLY = 'Operação disponível apenas para o provedor Evolution'

// Guardas comuns: permissão, empresa e config
async function resolveConfig(companyIdParam: string | null) {
  const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
  if (error) return { error }

  const companyId = companyIdParam || user!.companyId
  if (!companyId) {
    return { error: NextResponse.json({ error: 'Company ID é obrigatório' }, { status: 400 }) }
  }
  if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== companyId) {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }

  const config = await prisma.whatsAppConfig.findUnique({ where: { companyId } })
  if (!config) {
    return {
      error: NextResponse.json({ error: 'Configuração WhatsApp não encontrada. Configure primeiro.' }, { status: 404 }),
    }
  }
  return { companyId, config }
}

// GET /api/whatsapp/qrcode - Obter QR Code para conexão (só Evolution)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const resolved = await resolveConfig(searchParams.get('companyId'))
  if ('error' in resolved) return resolved.error
  const { companyId, config } = resolved

  if (config.provider !== 'EVOLUTION') {
    return NextResponse.json({ error: EVOLUTION_ONLY }, { status: 400 })
  }

  try {
    const qrCode = await getWhatsAppQRCode(companyId)
    if (qrCode) {
      return NextResponse.json({
        connected: false,
        state: 'connecting',
        qrCode,
        message: 'Escaneie o QR Code com seu WhatsApp',
      })
    }

    // Sem QR: pode já estar conectado
    const status = await checkWhatsAppConnection(companyId)
    if (status.connected) {
      return NextResponse.json({
        connected: true,
        state: 'open',
        phoneNumber: status.phoneNumber,
        message: 'WhatsApp já está conectado',
      })
    }

    return NextResponse.json({ error: 'Não foi possível gerar o QR Code. Tente novamente.' }, { status: 500 })
  } catch (error) {
    console.error('[QRCode] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao conectar com Evolution API', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}

// POST /api/whatsapp/qrcode - Verificar status da conexão (qualquer provedor)
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const resolved = await resolveConfig(body?.companyId || null)
  if ('error' in resolved) return resolved.error

  try {
    const result = await checkWhatsAppConnection(resolved.companyId)
    return NextResponse.json({
      connected: result.connected,
      state: result.connected ? 'open' : 'disconnected',
      phoneNumber: result.phoneNumber ?? undefined,
      error: result.error,
    })
  } catch (error) {
    console.error('Erro ao verificar conexão:', error)
    return NextResponse.json({
      connected: false,
      state: 'disconnected',
      error: error instanceof Error ? error.message : 'Erro ao verificar conexão',
    })
  }
}

// DELETE /api/whatsapp/qrcode - Desconectar instância (só Evolution)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const resolved = await resolveConfig(searchParams.get('companyId'))
  if ('error' in resolved) return resolved.error

  if (resolved.config.provider !== 'EVOLUTION') {
    return NextResponse.json({ error: EVOLUTION_ONLY }, { status: 400 })
  }

  try {
    await disconnectWhatsApp(resolved.companyId)
    return NextResponse.json({ message: 'WhatsApp desconectado com sucesso' })
  } catch (error) {
    console.error('Erro ao desconectar:', error)
    return NextResponse.json({ error: 'Erro ao desconectar WhatsApp' }, { status: 500 })
  }
}
