export interface IncomingOrderItem {
  serviceId: string | null
  serviceName: string
  description: string | null
  price: number | string
  quantity: number
  packageUsage?: { quantity: number } | null
}

export interface FormOrderItem {
  serviceId: string
  serviceName: string
  description: string
  price: number
  quantity: number
  saveGlobally: boolean
  isExisting: boolean
  usePackageQuantity: number
}

/**
 * Itens consecutivos do mesmo serviço em que algum veio de pacote viram um só item do formulário
 * (quantidade total; usePackageQuantity = unidades cobertas). Preço do item reagrupado: o do item
 * cobrado irmão; senão o preço atual do catálogo; senão 0 (o campo continua editável).
 */
export function regroupOrderItems(
  items: IncomingOrderItem[],
  catalogPrice: (serviceId: string) => number | undefined
): FormOrderItem[] {
  const out: FormOrderItem[] = []
  for (const s of items) {
    const prev = out[out.length - 1]
    const samePackageGroup =
      !!prev && !!s.serviceId && prev.serviceId === s.serviceId && (!!s.packageUsage || prev.usePackageQuantity > 0)

    if (samePackageGroup) {
      prev.quantity += s.quantity
      if (s.packageUsage) prev.usePackageQuantity += s.quantity
      else prev.price = Number(s.price)
      continue
    }

    out.push({
      serviceId: s.serviceId ?? '',
      serviceName: s.serviceName,
      description: s.description || '',
      price: s.packageUsage ? (catalogPrice(s.serviceId ?? '') ?? 0) : Number(s.price),
      quantity: s.quantity,
      saveGlobally: false,
      isExisting: true,
      usePackageQuantity: s.packageUsage ? s.quantity : 0,
    })
  }
  return out
}
