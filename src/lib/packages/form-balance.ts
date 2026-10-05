/** Lógica pura de saldo de pacote usada pelo OrderForm (sem React, testável). */

export interface BalanceEntry {
  serviceId: string
  remaining: number
}

export interface PackageWithUsages {
  serviceId: string
  status: string
  usages: { quantity: number; order: { id: string } }[]
}

export interface PackageUseItem {
  serviceId?: string | null
  quantity?: number | string
  usePackageQuantity?: number | string
}

/**
 * Saldo disponível por serviço. Na edição (editingOrderId), os consumos da própria OS em pacotes
 * ATIVOS voltam a contar, porque o PUT apaga os itens (devolvendo o saldo) antes de recriá-los.
 */
export function buildBalanceByService(
  balances: BalanceEntry[] | undefined,
  packages: PackageWithUsages[] | undefined,
  editingOrderId: string | null | undefined
): Map<string, number> {
  const map = new Map<string, number>()
  for (const b of balances ?? []) map.set(b.serviceId, b.remaining)
  if (editingOrderId) {
    for (const p of packages ?? []) {
      if (p.status !== 'ACTIVE') continue
      for (const u of p.usages) {
        if (u.order.id === editingOrderId) map.set(p.serviceId, (map.get(p.serviceId) ?? 0) + u.quantity)
      }
    }
  }
  return map
}

/**
 * Uso efetivo de pacote por item, em ordem: nunca promete mais que o pedido, a quantidade ou o
 * saldo (linhas anteriores do mesmo serviço consomem o saldo primeiro).
 */
export function computeEffectiveUse(items: PackageUseItem[], balanceByService: Map<string, number>): number[] {
  const left = new Map(balanceByService)
  return items.map((s) => {
    const requested = Number(s.usePackageQuantity) || 0
    if (!s.serviceId || requested <= 0) return 0
    const avail = left.get(s.serviceId) ?? 0
    const use = Math.max(0, Math.min(requested, Number(s.quantity) || 1, avail))
    left.set(s.serviceId, avail - use)
    return use
  })
}

/** Saldo que sobra para a linha `index` depois do uso efetivo das linhas anteriores do mesmo serviço. */
export function availableBefore(
  items: PackageUseItem[],
  effectiveUse: number[],
  index: number,
  balanceByService: Map<string, number>
): number {
  const serviceId = items[index]?.serviceId
  if (!serviceId) return 0
  let taken = 0
  for (let j = 0; j < index; j++) {
    if (items[j]?.serviceId === serviceId) taken += effectiveUse[j] ?? 0
  }
  return Math.max(0, (balanceByService.get(serviceId) ?? 0) - taken)
}

/**
 * Novo pedido de uso quando a quantidade muda: só mexe em linha que já usa pacote; acompanha a
 * quantidade até o disponível; sem saldo mantém a intenção (o uso efetivo limita depois).
 */
export function syncUseWithQuantity(currentUse: number, newQuantity: number, available: number): number {
  if (currentUse <= 0) return currentUse
  return available > 0 ? Math.min(newQuantity, available) : newQuantity
}
