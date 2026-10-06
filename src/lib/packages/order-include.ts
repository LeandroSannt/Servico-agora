import { Prisma } from '@prisma/client'

/** Itens da OS com o consumo de pacote, em ordem estável (o OrderForm reagrupa por ordem). */
export const orderServicesInclude = {
  include: {
    packageUsage: {
      select: {
        quantity: true,
        clientPackage: { select: { id: true, name: true } },
      },
    },
    // Preço atual do catálogo: o OrderForm usa para itens 100% cobertos (gravados a R$ 0)
    service: { select: { price: true } },
    // Equipamentos da linha (nome para listagem/detalhe/PDF; isActive para o form na edição)
    equipments: {
      select: { equipment: { select: { id: true, name: true, brand: true, model: true, isActive: true } } },
      orderBy: { equipment: { name: 'asc' } },
    },
  },
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
} satisfies Prisma.ServiceOrder$servicesArgs

export type OrderServiceWithUsage = Prisma.OrderServiceGetPayload<typeof orderServicesInclude>

/** Nome exibido em PDF/WhatsApp: "Limpeza (pacote)" quando coberto. */
export function displayServiceName(s: { serviceName: string; packageUsage: unknown | null }): string {
  return s.packageUsage ? `${s.serviceName} (pacote)` : s.serviceName
}

/** Produtos avulsos da OS em ordem estável. */
export const orderProductsInclude = {
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
} satisfies Prisma.ServiceOrder$productsArgs
