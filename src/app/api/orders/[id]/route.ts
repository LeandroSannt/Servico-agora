import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { updateOrderStatusSchema, serviceOrderSchema } from '@/lib/validations'
import { sendOrderFinishedEmail } from '@/lib/email/send-email'
import { sendOrderStatusWhatsApp, sendOrderPaidWhatsApp } from '@/lib/whatsapp/evolution-api'
import { requireAuth } from '@/lib/auth-utils'

// GET /api/orders/[id] - Buscar ordem por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        client: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        store: {
          include: {
            company: {
              select: { id: true, name: true, primaryColor: true, logoUrl: true },
            },
          },
        },
        services: {
          include: {
            service: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Erro ao buscar ordem:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar ordem de serviço' },
      { status: 500 }
    )
  }
}

// PATCH /api/orders/[id] - Atualizar status da ordem
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    console.log('[API Orders PATCH] Body recebido:', body)
    const { status, pausedReason } = updateOrderStatusSchema.parse(body)
    console.log('[API Orders PATCH] Status:', status, 'PausedReason:', pausedReason)

    const existingOrder = await prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        client: true,
        store: {
          include: {
            company: true,
          },
        },
        services: true,
      },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = { status }

    // Se está finalizando, adicionar data de conclusão
    if (status === 'FINISHED' && existingOrder.status !== 'FINISHED') {
      updateData.finishedAt = new Date()
    }

    // Se está marcando como pago, adicionar data de pagamento
    if (status === 'PAID' && existingOrder.status !== 'PAID') {
      updateData.paidAt = new Date()
      // Se não tinha finishedAt, também marca como finalizado
      if (!existingOrder.finishedAt) {
        updateData.finishedAt = new Date()
      }
    }

    // Se está pausado, salvar o motivo
    if (status === 'PAUSED') {
      updateData.pausedReason = pausedReason || null
    } else {
      // Limpar o motivo se não está mais pausado
      updateData.pausedReason = null
    }

    const order = await prisma.serviceOrder.update({
      where: { id },
      data: updateData,
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

    // Enviar notificações baseadas no status
    if (status === 'PAID') {
      // Enviar WhatsApp com PDF quando status for PAID
      if (order.client.phone) {
        try {
          const paidData = {
            clientName: order.client.name,
            clientPhone: order.client.phone,
            clientEmail: order.client.email,
            orderNumber: order.orderNumber,
            storeName: order.store.name,
            companyName: order.store.company.name,
            companyId: order.store.company.id,
            services: order.services.map((s) => ({
              name: s.serviceName,
              price: Number(s.price),
              quantity: s.quantity,
              description: s.description,
            })),
            totalAmount: Number(order.totalAmount),
            description: order.description,
            createdAt: order.createdAt,
            finishedAt: order.finishedAt,
            paidAt: order.paidAt,
          }

          await sendOrderPaidWhatsApp(paidData)
        } catch (whatsappError) {
          console.error('Erro ao enviar WhatsApp com PDF:', whatsappError)
          // Não falhar a requisição por causa do WhatsApp
        }
      }
    } else {
      // Dados comuns para notificações (status diferentes de PAID)
      const notificationData = {
        clientName: order.client.name,
        clientPhone: order.client.phone,
        clientEmail: order.client.email || '',
        orderNumber: order.orderNumber,
        storeName: order.store.name,
        companyName: order.store.company.name,
        companyId: order.store.company.id,
        status: status as 'RECEIVED' | 'IN_PROGRESS' | 'PAUSED' | 'FINISHED',
        pausedReason: status === 'PAUSED' ? (pausedReason || undefined) : undefined,
        services: order.services.map((s) => ({
          name: s.serviceName,
          price: Number(s.price),
          quantity: s.quantity,
        })),
        totalAmount: Number(order.totalAmount),
      }

      // Enviar notificação WhatsApp para mudanças de status (exceto PAID)
      if (order.client.phone && !order.whatsappSent) {
        try {
          const whatsappSent = await sendOrderStatusWhatsApp(notificationData)

          if (whatsappSent) {
            // Marcar WhatsApp como enviado apenas se foi finalizado (para evitar múltiplas mensagens)
            if (status === 'FINISHED') {
              await prisma.serviceOrder.update({
                where: { id },
                data: { whatsappSent: true },
              })
            }
          }
        } catch (whatsappError) {
          console.error('Erro ao enviar WhatsApp:', whatsappError)
          // Não falhar a requisição por causa do WhatsApp
        }
      }

      // Enviar email se finalizado e cliente tem email
      if (status === 'FINISHED' && order.client.email && !order.emailSent) {
        try {
          await sendOrderFinishedEmail({
            clientName: notificationData.clientName,
            clientEmail: notificationData.clientEmail,
            orderNumber: notificationData.orderNumber,
            storeName: notificationData.storeName,
            companyName: notificationData.companyName,
            services: notificationData.services,
            totalAmount: notificationData.totalAmount,
          })

          // Marcar email como enviado
          await prisma.serviceOrder.update({
            where: { id },
            data: { emailSent: true },
          })
        } catch (emailError) {
          console.error('Erro ao enviar email:', emailError)
          // Não falhar a requisição por causa do email
        }
      }
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Erro ao atualizar ordem:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar ordem de serviço' },
      { status: 500 }
    )
  }
}

// PUT /api/orders/[id] - Atualizar ordem completa (incluindo serviços)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAuth()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const validatedData = serviceOrderSchema.parse(body)

    const existingOrder = await prisma.serviceOrder.findUnique({
      where: { id },
      include: { store: true },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    // Calcular novo total
    const totalAmount = validatedData.services.reduce((sum, service) => {
      return sum + (service.price * service.quantity)
    }, 0)

    // Atualizar ordem em uma transação
    const order = await prisma.$transaction(async (tx) => {
      // Deletar serviços antigos
      await tx.orderService.deleteMany({
        where: { orderId: id },
      })

      // Atualizar ordem com novos serviços
      return tx.serviceOrder.update({
        where: { id },
        data: {
          description: validatedData.description,
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
          store: true,
          services: true,
        },
      })
    })

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
              storeId: existingOrder.storeId,
            },
          })
          console.log(`Serviço "${service.serviceName}" salvo globalmente`)
        } catch (serviceError) {
          console.error('Erro ao salvar serviço globalmente:', serviceError)
        }
      }
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Erro ao atualizar ordem:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao atualizar ordem de serviço' },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[id] - Deletar ordem
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingOrder = await prisma.serviceOrder.findUnique({
      where: { id },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Ordem de serviço não encontrada' },
        { status: 404 }
      )
    }

    await prisma.serviceOrder.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Ordem de serviço deletada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar ordem:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar ordem de serviço' },
      { status: 500 }
    )
  }
}
