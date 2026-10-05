export const packageInclude = {
  store: { select: { id: true, name: true } },
  service: { select: { id: true, name: true, price: true, isActive: true } },
  _count: { select: { sales: true } },
} as const

type PackageRow = {
  price: unknown
  quantity: number
  service: { price: unknown }
}

/** Preço por unidade e economia (%) em relação ao avulso, calculados no servidor. */
export function withDerived<T extends PackageRow>(pkg: T) {
  const price = Number(pkg.price)
  const unitPrice = Math.round((price / pkg.quantity) * 100) / 100
  const servicePrice = Number(pkg.service.price)
  const savingsPercent = servicePrice > 0 ? Math.round((1 - unitPrice / servicePrice) * 100) : 0
  return { ...pkg, price, unitPrice, savingsPercent }
}
