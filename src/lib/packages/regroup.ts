export interface IncomingOrderItem {
  serviceId: string | null
  serviceName: string
  description: string | null
  price: number | string
  quantity: number
  packageUsage?: { quantity: number } | null
  equipments?: { equipment: { id: string } }[] | null
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
  equipmentIds: string[]
}

/** Ids dos equipamentos do registro, ordenados (para comparar conjuntos). */
function equipmentIdsOf(s: IncomingOrderItem): string[] {
  return (s.equipments ?? []).map((e) => e.equipment.id).sort()
}

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i])

function plainItem(s: IncomingOrderItem): FormOrderItem {
  return {
    serviceId: s.serviceId ?? '',
    serviceName: s.serviceName,
    description: s.description || '',
    price: Number(s.price),
    quantity: s.quantity,
    saveGlobally: false,
    isExisting: true,
    usePackageQuantity: 0,
    equipmentIds: equipmentIdsOf(s),
  }
}

/**
 * Reconstrói as linhas do formulário a partir dos itens gravados. O servidor grava cada linha do
 * formulário como [linhas cobertas…, no máximo uma linha cobrada], em ordem. Então um grupo começa
 * numa linha coberta (packageUsage), absorve as cobertas seguintes do mesmo serviço e com os mesmos equipamentos e depois NO
 * MÁXIMO uma linha cobrada do mesmo serviço (preço e, se faltar, descrição vêm dela), e fecha.
 * Linha cobrada nunca absorve cobertas seguintes; linhas cobradas avulsas ficam separadas.
 * Sem linha cobrada, o preço vem do catálogo (catalogPrice) ou 0 (o campo continua editável).
 */
export function regroupOrderItems(
  items: IncomingOrderItem[],
  catalogPrice: (serviceId: string) => number | undefined
): FormOrderItem[] {
  const out: FormOrderItem[] = []
  let i = 0
  while (i < items.length) {
    const s = items[i]
    i++
    if (!s.packageUsage) {
      out.push(plainItem(s))
      continue
    }

    const group: FormOrderItem = {
      ...plainItem(s),
      price: s.serviceId ? (catalogPrice(s.serviceId) ?? 0) : 0,
      usePackageQuantity: s.quantity,
    }
    // Mesmo serviço E mesmo conjunto de equipamentos: linhas do formulário diferentes com
    // equipamentos diferentes não podem ser fundidas (perderia o vínculo)
    const sameLine = (next: IncomingOrderItem | undefined) =>
      !!next && !!s.serviceId && next.serviceId === s.serviceId && sameIds(equipmentIdsOf(next), group.equipmentIds)

    while (i < items.length && sameLine(items[i]) && items[i].packageUsage) {
      group.quantity += items[i].quantity
      group.usePackageQuantity += items[i].quantity
      i++
    }
    if (i < items.length && sameLine(items[i]) && !items[i].packageUsage) {
      const charged = items[i]
      group.quantity += charged.quantity
      group.price = Number(charged.price)
      if (!group.description) group.description = charged.description || ''
      i++
    }
    out.push(group)
  }
  return out
}

/** Preço atual do serviço vinculado a cada item (incluído pela API), para os itens 100% cobertos. */
export function catalogPriceFromItems(
  items: { serviceId: string | null; service?: { price: number | string } | null }[]
): (serviceId: string) => number | undefined {
  const prices = new Map<string, number>()
  for (const s of items) {
    if (s.serviceId && s.service) prices.set(s.serviceId, Number(s.service.price))
  }
  return (serviceId) => prices.get(serviceId)
}
