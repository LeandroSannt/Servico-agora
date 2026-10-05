import type { Allocation } from './allocate'

export interface OrderItemInput {
  serviceId?: string | null
  serviceName: string
  description?: string | null
  price: number
  quantity: number
  saveGlobally?: boolean
  usePackageQuantity?: number
}

export interface SplitItem {
  serviceId: string | null
  serviceName: string
  description: string | null
  price: number
  quantity: number
  saveGlobally: boolean
  /** Presente só nos itens cobertos pelo pacote (preço 0). */
  allocation?: Allocation
}

/** Um item coberto por alocação (preço 0) + um item cobrado com o restante, se sobrar. */
export function splitOrderItem(item: OrderItemInput, allocations: Allocation[]): SplitItem[] {
  const base = {
    serviceId: item.serviceId?.trim() || null,
    serviceName: item.serviceName,
    description: item.description || null,
  }

  const covered: SplitItem[] = allocations.map((allocation) => ({
    ...base,
    price: 0,
    quantity: allocation.quantity,
    saveGlobally: false,
    allocation,
  }))

  const coveredQty = allocations.reduce((sum, a) => sum + a.quantity, 0)
  const chargedQty = item.quantity - coveredQty
  if (chargedQty > 0) {
    covered.push({ ...base, price: item.price, quantity: chargedQty, saveGlobally: item.saveGlobally ?? false })
  }
  return covered
}
