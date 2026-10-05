import type { PackageBalance } from './balance'
import { InsufficientBalanceError } from './errors'

export interface Allocation {
  clientPackageId: string
  quantity: number
}

export interface AllocationResult {
  allocations: Allocation[]
  /** Saldos restantes após a alocação (sem os zerados), para o próximo item do mesmo serviço. */
  balances: PackageBalance[]
}

/** Distribui `qty` pelos pacotes na ordem recebida (FIFO). Lança se o saldo não cobre. */
export function allocateFifo(balances: PackageBalance[], qty: number, serviceId: string): AllocationResult {
  if (!Number.isInteger(qty) || qty < 0) throw new RangeError('Quantidade deve ser inteira e >= 0')
  const total = balances.reduce((sum, b) => sum + b.remaining, 0)
  if (qty > total) throw new InsufficientBalanceError(serviceId, total)

  const allocations: Allocation[] = []
  const next: PackageBalance[] = []
  let left = qty

  for (const b of balances) {
    const take = Math.min(b.remaining, left)
    if (take > 0) allocations.push({ clientPackageId: b.id, quantity: take })
    left -= take
    const rest = b.remaining - take
    if (rest > 0) next.push({ id: b.id, remaining: rest })
  }

  return { allocations, balances: next }
}
