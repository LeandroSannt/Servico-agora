/** Total gravado da OS: VIP não paga (itens mantêm o preço, o total é zero). */
export function orderTotalFor(total: number, isVip: boolean): number {
  return isVip ? 0 : total
}

/** Nome da empresa só existe para VIP; vazio vira null. */
export function normalizeVipCompanyName(isVip: boolean, name: string | null | undefined): string | null {
  if (!isVip) return null
  const trimmed = (name ?? '').trim()
  return trimmed ? trimmed : null
}
