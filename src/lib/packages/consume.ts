import { Prisma } from '@prisma/client'
import { toBalances, type PackageBalance } from './balance'
import { allocateFifo } from './allocate'
import { splitOrderItem, type OrderItemInput } from './split'
import { InvalidPackageUsageError } from './errors'

interface Params {
  orderId: string
  clientId: string
  items: OrderItemInput[]
}

/**
 * Cria os itens da OS (divididos em coberto/cobrado) e os consumos de pacote.
 * Deve rodar dentro de `prisma.$transaction`. No PUT, a transação precisa (a) travar a linha
 * da OS antes de tudo (o `update` da ordem), para PUTs concorrentes da mesma OS se serializarem,
 * e (b) rodar o `deleteMany` dos itens antigos antes desta função, para o saldo lido aqui já não
 * contar o consumo da própria OS.
 * Lança InsufficientBalanceError se o saldo não cobre e InvalidPackageUsageError se um item
 * usa pacote sem serviço cadastrado ou além da sua quantidade.
 */
export async function createOrderItemsWithPackages(tx: Prisma.TransactionClient, { orderId, clientId, items }: Params) {
  // Saldos por serviço, carregados sob lock só para os serviços que vão usar pacote
  const balancesByService = new Map<string, PackageBalance[]>()

  const serviceIds = Array.from(
    new Set(
      items
        .filter((i) => (i.usePackageQuantity ?? 0) > 0)
        .map((i) => i.serviceId?.trim())
        .filter((id): id is string => !!id)
    )
  )

  if (serviceIds.length > 0) {
    // Um único lock para todos os serviços, sempre em ORDER BY id: transações concorrentes do
    // mesmo cliente travam na mesma ordem (sem deadlock). Prisma não expõe FOR UPDATE.
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM client_packages
      WHERE client_id = ${clientId} AND service_id = ANY(${serviceIds}) AND status = 'ACTIVE'
      ORDER BY id
      FOR UPDATE`

    // O conjunto travado e o conjunto lido precisam ser exatamente as mesmas linhas
    // (linhas travadas não mudam de status enquanto o lock durar; um pacote vendido depois do
    // lock não entra no cálculo).
    const packages = await tx.clientPackage.findMany({
      where: { id: { in: locked.map((r) => r.id) } },
      select: {
        id: true,
        serviceId: true,
        quantity: true,
        soldAt: true,
        usages: { select: { quantity: true, orderId: true } },
      },
    })

    for (const serviceId of serviceIds) {
      balancesByService.set(serviceId, toBalances(packages.filter((p) => p.serviceId === serviceId)))
    }
  }

  for (const item of items) {
    const use = item.usePackageQuantity ?? 0
    const serviceId = item.serviceId?.trim() || null
    if (use > item.quantity || (use > 0 && !serviceId)) {
      throw new InvalidPackageUsageError('usePackageQuantity inválido para o item')
    }
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
