import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { serviceOrderSchema } from '@/lib/validations'
import { generateOrderNumber } from '@/lib/utils'
import { requireAuth, getCompanyFilter } from '@/lib/auth-utils'
import { sendOrderStatusWhatsApp } from '@/lib/whatsapp/evolution-api'

// GET /api/orders - Listar ordens de serviço
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const storeId = searchParams.get('storeId')
    const clientId = searchParams.get('clientId')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Construir filtro baseado no role do usuário
    const where: Record<string, unknown> = {}

    // Filtrar por company para todos os usuários (exceto SUPER_ADMIN que vê tudo)
    if (user!.role !== 'SUPER_ADMIN') {
      const companyFilter = getCompanyFilter(user!)
      if (companyFilter.companyId) {
        where.store = { companyId: companyFilter.companyId }
      }
    }

    if (status) {
      where.status = status
    }

    // Se filtrar por loja específica, sobrescreve o filtro de store
    if (storeId) {
      where.store = { id: storeId }
    }

    if (clientId) {
      where.clientId = clientId
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // Filtro por período
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        // Adicionar 1 dia para incluir o dia final completo
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        ;(where.createdAt as Record<string, Date>).lt = end
      }
    }

    const [orders, total] = await Promise.all([
      prisma.serviceOrder.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true, phone: true, email: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
          store: {
            select: { id: true, name: true },
          },
          services: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.serviceOrder.count({ where }),
    ])

    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erro ao listar ordens:', error)
    return NextResponse.json(
      { error: 'Erro ao listar ordens de serviço', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// POST /api/orders - Criar nova ordem de serviço
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const body = await request.json()
    const validatedData = serviceOrderSchema.parse(body)

    // Verificar se a loja existe e se o usuário tem permissão
    const store = await prisma.store.findUnique({
      where: { id: validatedData.storeId },
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Loja não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissão
    if (user!.role === 'COMPANY_ADMIN' && store.companyId !== user!.companyId) {
      return NextResponse.json(
        { error: 'Você não tem permissão para criar ordens nesta loja' },
        { status: 403 }
      )
    }

    if (['MANAGER', 'EMPLOYEE'].includes(user!.role) && user!.storeId !== validatedData.storeId) {
      return NextResponse.json(
        { error: 'Você só pode criar ordens na sua própria loja' },
        { status: 403 }
      )
    }

    // Verificar se cliente existe
    const client = await prisma.client.findUnique({
      where: { id: validatedData.clientId },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Gerar número da ordem
    const orderNumber = generateOrderNumber()

    // Calcular total
    const totalAmount = validatedData.services.reduce((sum, service) => {
      return sum + (service.price * service.quantity)
    }, 0)

    // Criar ordem com serviços
    const order = await prisma.serviceOrder.create({
      data: {
        orderNumber,
        description: validatedData.description,
        storeId: validatedData.storeId,
        clientId: validatedData.clientId,
        createdById: user!.id, // Usa o usuário autenticado
        totalAmount,
        services: {
          create: validatedData.services.map((service) => ({
            serviceId: service.serviceId?.trim() || null,
            serviceName: service.serviceName,
            description: service.description || null,
            price: service.price,
            quantity: service.quantity,
            saveGlobally: service.saveGlobally ?? false,
          })),
        },
      },
      include: {
        client: true,
        createdBy: {
          select: { id: true, name: true },
        },
        store: {
          include: {
            company: true,
          },
        },
        services: true,
      },
    })

    // Enviar notificação WhatsApp para status RECEIVED (nova OS criada)
    try {
      await sendOrderStatusWhatsApp({
        clientName: order.client.name,
        clientPhone: order.client.phone,
        orderNumber: order.orderNumber,
        storeName: order.store.name,
        companyName: order.store.company.name,
        companyId: order.store.company.id,
        status: 'RECEIVED',
        services: order.services.map((s) => ({
          name: s.serviceName,
          price: Number(s.price),
          quantity: s.quantity,
        })),
        totalAmount: Number(order.totalAmount),
      })
      console.log('[WhatsApp] Notificação RECEIVED enviada para:', order.client.phone)
    } catch (whatsappError) {
      console.error('[WhatsApp] Erro ao enviar notificação RECEIVED:', whatsappError)
      // Não falha a criação da OS se o WhatsApp falhar
    }

    // Salvar serviços novos globalmente se solicitado
    for (const service of validatedData.services) {
      const serviceId = service.serviceId?.trim()
      const isNewService = !serviceId
      const shouldSaveGlobally = service.saveGlobally === true && isNewService && service.isExisting !== true
      if (shouldSaveGlobally) {
        try {
          await prisma.service.create({
            data: {
              name: service.serviceName,
              description: service.description || null,
              price: service.price,
              storeId: validatedData.storeId,
            },
          })
          console.log(`Serviço "${service.serviceName}" salvo globalmente`)
        } catch (serviceError) {
          console.error('Erro ao salvar serviço globalmente:', serviceError)
          // Não falha a criação da OS se o serviço não for salvo
        }
      }
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar ordem:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao criar ordem de serviço' },
      { status: 500 }
    )
  }
}
