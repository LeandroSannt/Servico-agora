import { NextResponse } from 'next/server'
import { checkWhatsAppConnection, getWhatsAppQRCode } from '@/lib/whatsapp/evolution-api'
import { requireRoles } from '@/lib/auth-utils'

// GET /api/whatsapp/status - Verificar status da conexão WhatsApp
export async function GET() {
  try {
    // Apenas admins podem ver o status
    const { error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const isConnected = await checkWhatsAppConnection()

    let qrCode: string | null = null
    if (!isConnected) {
      qrCode = await getWhatsAppQRCode()
    }

    return NextResponse.json({
      connected: isConnected,
      qrCode,
      message: isConnected
        ? 'WhatsApp conectado e pronto para enviar mensagens'
        : 'WhatsApp desconectado. Escaneie o QR Code para conectar.',
    })
  } catch (error) {
    console.error('Erro ao verificar status do WhatsApp:', error)
    return NextResponse.json(
      {
        error: 'Erro ao verificar status do WhatsApp',
        connected: false,
        qrCode: null,
      },
      { status: 500 }
    )
  }
}
