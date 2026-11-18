// Página pública da OS: o cliente acompanha andamento, valores e fotos pelo link recebido.
// Sem login; o token do link (144 bits aleatórios) é a autorização.
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import prisma from '@/lib/prisma'
import PublicOrderView from '@/components/orders/PublicOrderView'
import { orderServicesInclude, orderProductsInclude } from '@/lib/packages/order-include'
import { isPublicTokenShape, publicOrderLogoPath, publicOrderPhotoPath } from '@/lib/orders/public-link'
import { buildProgressSteps } from '@/lib/orders/progress'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ token: string }> }

const loadOrder = cache(async (token: string) => {
  if (!isPublicTokenShape(token)) return null
  return prisma.serviceOrder.findUnique({
    where: { publicToken: token },
    select: {
      orderNumber: true,
      description: true,
      status: true,
      pausedReason: true,
      totalAmount: true,
      isVipOrder: true,
      createdAt: true,
      finishedAt: true,
      paidAt: true,
      client: { select: { name: true } },
      store: {
        select: {
          name: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          company: { select: { name: true, phone: true, logoMimeType: true, logoUpdatedAt: true, logoUrl: true } },
        },
      },
      services: orderServicesInclude,
      products: orderProductsInclude,
      photos: { select: { id: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
    },
  })
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const order = await loadOrder(token)
  return {
    title: order ? `OS Nº ${order.orderNumber} — ${order.store.company.name}` : 'Ordem de serviço',
    robots: { index: false, follow: false },
  }
}

export default async function PublicOrderPage({ params }: Props) {
  const { token } = await params
  const order = await loadOrder(token)
  if (!order) notFound()

  const { store } = order
  const company = store.company
  const logoSrc = company.logoMimeType
    ? publicOrderLogoPath(token, company.logoUpdatedAt?.getTime() ?? 0)
    : company.logoUrl
  const contactPhone = store.phone || company.phone
  const cityState = [store.city, store.state].filter(Boolean).join('/')
  const address = [store.address, cityState].filter(Boolean).join(' — ')

  // O comprovante é componente de cliente: só dados serializáveis (Decimal -> number, Date -> ISO)
  const receiptOrder = {
    orderNumber: order.orderNumber,
    description: order.description,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    isVipOrder: order.isVipOrder,
    createdAt: order.createdAt.toISOString(),
    client: { name: order.client.name, phone: '' },
    store: { name: store.name },
    services: order.services.map((s) => ({
      id: s.id,
      serviceName: s.serviceName,
      price: Number(s.price),
      quantity: s.quantity,
      packageUsage: s.packageUsage ? { quantity: s.packageUsage.quantity } : null,
      equipments: s.equipments.map((e) => ({ equipment: { id: e.equipment.id, name: e.equipment.name } })),
    })),
    products: order.products.map((p) => ({
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      unitPrice: Number(p.unitPrice),
    })),
  }

  const steps = buildProgressSteps({
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    finishedAt: order.finishedAt?.toISOString() ?? null,
    paidAt: order.paidAt?.toISOString() ?? null,
  })

  return (
    <PublicOrderView
      companyName={company.name}
      storeName={store.name}
      logoSrc={logoSrc}
      contactPhone={contactPhone}
      address={address}
      status={order.status}
      pausedReason={order.pausedReason}
      steps={steps}
      receiptOrder={receiptOrder}
      photoUrls={order.photos.map((p) => publicOrderPhotoPath(token, p.id))}
    />
  )
}
