import prisma from '@/lib/prisma'
import { aggregateServiceBalances, type ServiceBalance } from './balance'

export type { ServiceBalance }

const clientPackageInclude = {
  service: { select: { id: true, name: true } },
  soldBy: { select: { name: true } },
  usages: {
    select: {
      quantity: true,
      createdAt: true,
      orderId: true,
      order: { select: { id: true, orderNumber: true, status: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const

/** Saldo por serviço (só ACTIVE, só remaining > 0) para vários clientes de uma vez. */
export async function getBalancesByClient(clientIds: string[]): Promise<Map<string, ServiceBalance[]>> {
  const result = new Map<string, ServiceBalance[]>()
  if (clientIds.length === 0) return result

  const packages = await prisma.clientPackage.findMany({
    where: { clientId: { in: clientIds }, status: 'ACTIVE' },
    select: {
      id: true,
      clientId: true,
      quantity: true,
      soldAt: true,
      service: { select: { id: true, name: true } },
      usages: { select: { quantity: true, orderId: true } },
    },
    orderBy: [{ soldAt: 'asc' }, { id: 'asc' }],
  })

  const byClient = new Map<string, typeof packages>()
  for (const pkg of packages) {
    const list = byClient.get(pkg.clientId) ?? []
    list.push(pkg)
    byClient.set(pkg.clientId, list)
  }
  byClient.forEach((list, clientId) => {
    const balances = aggregateServiceBalances(list)
    if (balances.length > 0) result.set(clientId, balances)
  })
  return result
}

export async function listClientPackages(clientId: string) {
  const packages = await prisma.clientPackage.findMany({
    where: { clientId },
    include: clientPackageInclude,
    orderBy: { soldAt: 'desc' },
  })
  const balances = (await getBalancesByClient([clientId])).get(clientId) ?? []
  return { balances, packages: packages.map(serializeClientPackage) }
}

export async function loadClientPackage(id: string) {
  return prisma.clientPackage.findUnique({ where: { id }, include: clientPackageInclude })
}

type Row = NonNullable<Awaited<ReturnType<typeof loadClientPackage>>>

export function serializeClientPackage(cp: Row) {
  const used = cp.usages.reduce((sum, u) => sum + u.quantity, 0)
  return {
    id: cp.id,
    name: cp.name,
    serviceId: cp.serviceId,
    serviceName: cp.service.name,
    quantity: cp.quantity,
    used,
    remaining: cp.status === 'ACTIVE' ? Math.max(0, cp.quantity - used) : 0,
    price: Number(cp.price),
    status: cp.status,
    soldAt: cp.soldAt,
    cancelledAt: cp.cancelledAt,
    soldBy: { name: cp.soldBy.name },
    notes: cp.notes,
    usages: cp.usages.map((u) => ({
      quantity: u.quantity,
      createdAt: u.createdAt,
      order: u.order,
    })),
  }
}
