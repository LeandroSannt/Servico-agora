// Linhas do "comprovante" da OS (detalhe pensado para print no celular). Funções puras.

export interface ReceiptServiceInput {
  id: string
  serviceName: string
  price: number | string
  quantity: number
  packageUsage?: { quantity: number } | null
}

export interface ReceiptProductInput {
  id: string
  name: string
  quantity: number
  unitPrice: number | string
}

export interface ReceiptLine {
  key: string
  name: string
  /** Coluna do meio: "50,00", "2x 50,00", "PACOTE"... */
  detail: string
  /** Valor cobrado na linha (o que o pacote cobre não entra). */
  amount: number
}

/** 1234.5 -> "1.234,50" (sem o "R$", como na coluna do meio da planilha). */
export function formatNumberBR(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function unitDetail(quantity: number, unit: number): string {
  return quantity > 1 ? `${quantity}x ${formatNumberBR(unit)}` : formatNumberBR(unit)
}

export function buildReceiptLines(
  services: ReceiptServiceInput[],
  products: ReceiptProductInput[] = []
): ReceiptLine[] {
  const serviceLines = services.map((s): ReceiptLine => {
    const price = Number(s.price)
    const covered = Math.min(s.quantity, Math.max(0, s.packageUsage?.quantity ?? 0))
    const charged = s.quantity - covered
    let detail: string
    if (covered === 0) detail = unitDetail(s.quantity, price)
    else if (charged === 0) detail = covered > 1 ? `${covered}x PACOTE` : 'PACOTE'
    else detail = `${unitDetail(charged, price)} + ${covered} PACOTE`
    return { key: `s-${s.id}`, name: s.serviceName, detail, amount: price * charged }
  })

  const productLines = products.map((p): ReceiptLine => {
    const unit = Number(p.unitPrice)
    return { key: `p-${p.id}`, name: p.name, detail: unitDetail(p.quantity, unit), amount: unit * p.quantity }
  })

  return [...serviceLines, ...productLines]
}

export function receiptSubtotal(lines: ReceiptLine[]): number {
  return Math.round(lines.reduce((sum, l) => sum + l.amount, 0) * 100) / 100
}
