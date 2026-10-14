import type { Prisma } from '@prisma/client'

export class ProductAccessError extends Error {
  constructor() {
    super('Produto não pertence à loja da OS')
    this.name = 'ProductAccessError'
  }
}

interface Input {
  name: string
  quantity: number
  unitPrice: number
  productId?: string
  saveToCatalog?: boolean
}

export async function resolveOrderProducts(tx: Prisma.TransactionClient, storeId: string, products: Input[]) {
  const ids = Array.from(new Set(products.map((p) => p.productId).filter((x): x is string => !!x)))
  if (ids.length > 0) {
    const found = await tx.product.findMany({ where: { id: { in: ids }, storeId }, select: { id: true } })
    if (found.length !== ids.length) throw new ProductAccessError()
  }
  const out: { name: string; quantity: number; unitPrice: number; productId: string | null }[] = []
  for (const p of products) {
    let productId = p.productId ?? null
    if (!productId && p.saveToCatalog === true) {
      const created = await tx.product.create({ data: { name: p.name, price: p.unitPrice, storeId } })
      productId = created.id
    }
    out.push({ name: p.name, quantity: p.quantity, unitPrice: p.unitPrice, productId })
  }
  return out
}
