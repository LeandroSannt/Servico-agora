import { NextResponse } from 'next/server'
import { requireRoles } from '@/lib/auth-utils'
import { globalProvider, isMetaMock } from '@/lib/whatsapp/resolve-provider'

// GET /api/whatsapp/status - Status da conexão do provedor global (.env)
export async function GET() {
  try {
    const { error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const mock = isMetaMock()
    const provider = globalProvider()
    if (!provider) {
      return NextResponse.json({
        connected: false,
        qrCode: null,
        mock,
        message: 'WhatsApp não configurado no ambiente',
      })
    }

    const status = await provider.checkConnection()
    let qrCode: string | null = null
    if (!status.connected && provider.ensureInstanceAndGetQRCode) {
      qrCode = await provider.ensureInstanceAndGetQRCode().catch(() => null)
    }

    return NextResponse.json({
      connected: status.connected,
      qrCode,
      mock,
      error: status.error,
      message: status.connected
        ? 'WhatsApp conectado e pronto para enviar mensagens'
        : qrCode
          ? 'WhatsApp desconectado. Escaneie o QR Code para conectar.'
          : status.error || 'WhatsApp desconectado.',
    })
  } catch (error) {
    console.error('Erro ao verificar status do WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar status do WhatsApp', connected: false, qrCode: null },
      { status: 500 }
    )
  }
}
