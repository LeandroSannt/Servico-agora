export interface PackageUsageLite {
  quantity: number
  orderId: string
}

/**
 * Pacote vendido com seus consumos. Quem chama deve passar apenas pacotes ATIVOS.
 * No servidor, os consumos da própria OS já são apagados antes de ler os saldos,
 * então `editingOrderId` só serve ao formulário no navegador.
 */
export interface PackageWithUsages {
  id: string
  quantity: number
  soldAt: Date
  usages: PackageUsageLite[]
}

export interface PackageBalance {
  id: string
  remaining: number
}

/** Saldo de um pacote. Consumos da OS em edição (`editingOrderId`) não contam como usados. */
export function remainingOf(pkg: PackageWithUsages, editingOrderId?: string | null): number {
  const used = pkg.usages
    .filter((u) => !editingOrderId || u.orderId !== editingOrderId)
    .reduce((sum, u) => sum + u.quantity, 0)
  return Math.max(0, pkg.quantity - used)
}

/** Saldos por pacote, mais antigos primeiro (FIFO), só os que ainda têm saldo. */
export function toBalances(packages: PackageWithUsages[], editingOrderId?: string | null): PackageBalance[] {
  return [...packages]
    .sort((a, b) => a.soldAt.getTime() - b.soldAt.getTime() || a.id.localeCompare(b.id))
    .map((p) => ({ id: p.id, remaining: remainingOf(p, editingOrderId) }))
    .filter((b) => b.remaining > 0)
}

/** Saldo total de um serviço para o cliente. */
export function computeBalance(packages: PackageWithUsages[], editingOrderId?: string | null): number {
  return toBalances(packages, editingOrderId).reduce((sum, b) => sum + b.remaining, 0)
}
