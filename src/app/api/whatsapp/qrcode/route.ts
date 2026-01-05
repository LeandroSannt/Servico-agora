import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRoles } from '@/lib/auth-utils'
import axios from 'axios'

// Normaliza a URL removendo barras finais
function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

// GET /api/whatsapp/qrcode - Obter QR Code para conexão
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

    // Buscar config da company
    const config = await prisma.whatsAppConfig.findUnique({
      where: { companyId },
    })

    console.log('config',config)

    if (!config) {
      return NextResponse.json(
        { error: 'Configuração WhatsApp não encontrada. Configure primeiro.' },
        { status: 404 }
      )
    }

    const apiUrl = normalizeUrl(config.apiUrl)

    // Verificar se a instância já está conectada
    try {
      const stateResponse = await axios.get(
        `${apiUrl}/instance/connectionState/${config.instanceName}`,
        {
          headers: { apikey: config.apiKey },
          timeout: 10000,
        }
      )

      const state = stateResponse.data?.instance?.state
      if (state === 'open') {
        // Já conectado, atualizar status
        await prisma.whatsAppConfig.update({
          where: { id: config.id },
          data: {
            isConnected: true,
            phoneNumber: stateResponse.data?.instance?.ownerJid?.replace('@s.whatsapp.net', '') || null,
          },
        })

        return NextResponse.json({
          connected: true,
          state: 'open',
          phoneNumber: stateResponse.data?.instance?.ownerJid?.replace('@s.whatsapp.net', ''),
          message: 'WhatsApp já está conectado',
        })
      }
    } catch {
      // Instância pode não existir ainda, vamos criar
    }

    // Tentar criar instância se não existir
    try {
      console.log('[QRCode] ========== CRIANDO INSTÂNCIA ==========')
      console.log('[QRCode] Instance Name:', config.instanceName)
      console.log('[QRCode] API URL:', apiUrl)
      console.log('[QRCode] API Key (primeiros 10 chars):', config.apiKey?.substring(0, 10) + '...')

      const createResponse = await axios.post(
        `${apiUrl}/instance/create`,
        {
          instanceName: config.instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        },
        {
          headers: {
            apikey: config.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      )
      console.log('[QRCode] Instância criada com sucesso:', createResponse.status)

      // Se a criação já retornou QR Code, usar ele
      if (createResponse.data?.qrcode?.base64) {
        return NextResponse.json({
          connected: false,
          state: 'connecting',
          qrCode: createResponse.data.qrcode.base64,
          message: 'Escaneie o QR Code com seu WhatsApp',
        })
      }
    } catch (createError) {
      // Instância pode já existir, verificar o erro
      if (axios.isAxiosError(createError)) {
        console.log('[QRCode] ========== ERRO AO CRIAR INSTÂNCIA ==========')
        console.log('[QRCode] Status:', createError.response?.status)
        console.log('[QRCode] Data:', JSON.stringify(createError.response?.data, null, 2))
        console.log('[QRCode] Message:', createError.message)

        // Se for 401, a API Key está errada
        if (createError.response?.status === 401) {
          console.log('[QRCode] ❌ API KEY INVÁLIDA! Verifique a configuração.')
        }

        // Se não for erro de "já existe", pode ser outro problema
        if (createError.response?.status !== 409 && !createError.response?.data?.message?.includes('already')) {
          // Continuar mesmo assim, pode ser que a instância exista
        }
      }
    }

    // Obter QR Code
    let qrResponse
    try {
      qrResponse = await axios.get(
        `${apiUrl}/instance/connect/${config.instanceName}`,
        {
          headers: { apikey: config.apiKey },
          timeout: 30000,
        }
      )
    } catch (connectError) {
      // Se a instância não existe, tentar criar novamente
      if (axios.isAxiosError(connectError) && connectError.response?.status === 404) {
        console.log('[QRCode] Instância não encontrada, criando...')
        try {
          const createResponse = await axios.post(
            `${apiUrl}/instance/create`,
            {
              instanceName: config.instanceName,
              qrcode: true,
              integration: 'WHATSAPP-BAILEYS',
            },
            {
              headers: {
                apikey: config.apiKey,
                'Content-Type': 'application/json',
              },
              timeout: 15000,
            }
          )

          if (createResponse.data?.qrcode?.base64) {
            return NextResponse.json({
              connected: false,
              state: 'connecting',
              qrCode: createResponse.data.qrcode.base64,
              message: 'Escaneie o QR Code com seu WhatsApp',
            })
          }

          // Tentar conectar novamente após criar
          qrResponse = await axios.get(
            `${apiUrl}/instance/connect/${config.instanceName}`,
            {
              headers: { apikey: config.apiKey },
              timeout: 30000,
            }
          )
        } catch (retryError) {
          console.error('[QRCode] Erro ao criar/conectar instância:', retryError)
          throw retryError
        }
      } else {
        throw connectError
      }
    }

    const qrCode = qrResponse.data?.qrcode?.base64 || qrResponse.data?.base64

    if (!qrCode) {
      // Verificar se conectou durante o processo
      const stateCheck = await axios.get(
        `${apiUrl}/instance/connectionState/${config.instanceName}`,
        {
          headers: { apikey: config.apiKey },
          timeout: 10000,
        }
      )

      if (stateCheck.data?.instance?.state === 'open') {
        await prisma.whatsAppConfig.update({
          where: { id: config.id },
          data: {
            isConnected: true,
            phoneNumber: stateCheck.data?.instance?.ownerJid?.replace('@s.whatsapp.net', '') || null,
          },
        })

        return NextResponse.json({
          connected: true,
          state: 'open',
          phoneNumber: stateCheck.data?.instance?.ownerJid?.replace('@s.whatsapp.net', ''),
          message: 'WhatsApp conectado com sucesso',
        })
      }

      return NextResponse.json(
        { error: 'Não foi possível gerar o QR Code. Tente novamente.' },
        { status: 500 }
      )
    }

    // Atualizar status
    await prisma.whatsAppConfig.update({
      where: { id: config.id },
      data: { isConnected: false },
    })

    return NextResponse.json({
      connected: false,
      state: 'connecting',
      qrCode,
      message: 'Escaneie o QR Code com seu WhatsApp',
    })
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        {
          error: 'Erro ao conectar com Evolution API',
          details: error.response?.data || error.message
        },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao obter QR Code' },
      { status: 500 }
    )
  }
}

// POST /api/whatsapp/qrcode - Verificar status da conexão
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN'])
    if (error) return error

    const body = await request.json()
    const companyId = body.companyId || user!.companyId

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

    // Buscar config
    const config = await prisma.whatsAppConfig.findUnique({
      where: { companyId },
    })

    if (!config) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      )
    }

    const apiUrl = normalizeUrl(config.apiUrl)

    // Verificar status
    const response = await axios.get(
      `${apiUrl}/instance/connectionState/${config.instanceName}`,
      {
        headers: { apikey: config.apiKey },
        timeout: 10000,
      }
    )

    const state = response.data?.instance?.state
    const ownerJid = response.data?.instance?.ownerJid
    const isConnected = state === 'open'

    // Atualizar status no banco
    await prisma.whatsAppConfig.update({
      where: { id: config.id },
      data: {
        isConnected,
        phoneNumber: ownerJid?.replace('@s.whatsapp.net', '') || null,
      },
    })

    return NextResponse.json({
      connected: isConnected,
      state,
      phoneNumber: ownerJid?.replace('@s.whatsapp.net', ''),
    })
  } catch (error) {
    console.error('Erro ao verificar conexão:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar conexão' },
      { status: 500 }
    )
  }
}

// DELETE /api/whatsapp/qrcode - Desconectar instância
export async function DELETE(request: NextRequest) {
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

    // Buscar config
    const config = await prisma.whatsAppConfig.findUnique({
      where: { companyId },
    })

    if (!config) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      )
    }

    const apiUrl = normalizeUrl(config.apiUrl)

    // Desconectar instância
    await axios.delete(
      `${apiUrl}/instance/logout/${config.instanceName}`,
      {
        headers: { apikey: config.apiKey },
        timeout: 10000,
      }
    )

    // Atualizar status
    await prisma.whatsAppConfig.update({
      where: { id: config.id },
      data: {
        isConnected: false,
        phoneNumber: null,
      },
    })

    return NextResponse.json({
      message: 'WhatsApp desconectado com sucesso',
    })
  } catch (error) {
    console.error('Erro ao desconectar:', error)
    return NextResponse.json(
      { error: 'Erro ao desconectar WhatsApp' },
      { status: 500 }
    )
  }
}
