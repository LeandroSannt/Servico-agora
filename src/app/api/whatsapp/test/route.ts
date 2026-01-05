import { NextRequest, NextResponse } from 'next/server'
import { sendOrderStatusWhatsApp } from '@/lib/whatsapp/evolution-api'
import { requireRoles } from '@/lib/auth-utils'

// POST /api/whatsapp/test - Enviar mensagem de teste
export async function POST(request: NextRequest) {
  try {
    // Apenas admins podem testar
    const { error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const body = await request.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json(
        { error: 'Número de telefone é obrigatório' },
        { status: 400 }
      )
    }

    // Envia mensagem de teste
    const success = await sendOrderStatusWhatsApp({
      clientName: 'Cliente Teste',
      clientPhone: phone,
      orderNumber: 'TESTE-001',
      storeName: 'Loja Teste',
      companyName: 'Serviço Agora',
      companyId: body.companyId || '',
      status: 'FINISHED',
      services: [
        { name: 'Serviço de Teste', price: 100.0, quantity: 1 },
      ],
      totalAmount: 100.0,
    })

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Mensagem de teste enviada com sucesso!',
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Falha ao enviar mensagem. Verifique se o WhatsApp está conectado.',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem de teste:', error)
    return NextResponse.json(
      { error: 'Erro ao enviar mensagem de teste' },
      { status: 500 }
    )
  }
}
