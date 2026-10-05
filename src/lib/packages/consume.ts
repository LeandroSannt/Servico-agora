import { Prisma } from '@prisma/client'
import { toBalances, type PackageBalance } from './balance'
import { allocateFifo } from './allocate'
import { splitOrderItem, type OrderItemInput } from './split'

interface Params {
  orderId: string
  clientId: string
  items: OrderItemInput[]
}

/**
 * Cria os itens da OS (divididos em coberto/cobrado) e os consumos de pacote.
 * Deve rodar dentro de `prisma.$transaction`. No PUT, o `deleteMany` dos itens antigos
 * precisa rodar ANTES, para o saldo lido aqui já não contar o consumo da própria OS.
 * Lança InsufficientBalanceError se o saldo não cobre.
 */
export async function createOrderItemsWithPackages(tx: Prisma.TransactionClient, { orderId, clientId, items }: Params) {
  // Saldos por serviço, carregados sob lock só para os serviços que vão usar pacote
  const balancesByService = new Map<string, PackageBalance[]>()

  for (const item of items) {
    const use = item.usePackageQuantity ?? 0
    const serviceId = item.serviceId?.trim()
    if (use <= 0 || !serviceId || balancesByService.has(serviceId)) continue

    // Serializa salvamentos concorrentes do mesmo cliente+serviço (Prisma não expõe FOR UPDATE)
    await tx.$queryRaw`
      SELECT id FROM client_packages
      WHERE client_id = ${clientId} AND service_id = ${serviceId} AND status = 'ACTIVE'
      FOR UPDATE`

    const packages = await tx.clientPackage.findMany({
      where: { clientId, serviceId, status: 'ACTIVE' },
      select: { id: true, quantity: true, soldAt: true, usages: { select: { quantity: true, orderId: true } } },
    })
    balancesByService.set(serviceId, toBalances(packages))
  }

  for (const item of items) {
    const use = item.usePackageQuantity ?? 0
    const serviceId = item.serviceId?.trim() || null
    let allocations: { clientPackageId: string; quantity: number }[] = []

    if (use > 0 && serviceId) {
      const result = allocateFifo(balancesByService.get(serviceId) ?? [], use, serviceId)
      allocations = result.allocations
      balancesByService.set(serviceId, result.balances)
    }

    for (const part of splitOrderItem(item, allocations)) {
      const created = await tx.orderService.create({
        data: {
          orderId,
          serviceId: part.serviceId,
          serviceName: part.serviceName,
          description: part.description,
          price: part.price,
          quantity: part.quantity,
          saveGlobally: part.saveGlobally,
        },
      })
      if (part.allocation) {
        await tx.packageUsage.create({
          data: {
            clientPackageId: part.allocation.clientPackageId,
            orderId,
            orderServiceId: created.id,
            quantity: part.allocation.quantity,
          },
        })
      }
    }
  }
}

/** Total cobrado: itens cobertos saem a 0. */
export function computeOrderTotal(items: OrderItemInput[]): number {
  return items.reduce((sum, i) => sum + i.price * Math.max(0, i.quantity - (i.usePackageQuantity ?? 0)), 0)
}
