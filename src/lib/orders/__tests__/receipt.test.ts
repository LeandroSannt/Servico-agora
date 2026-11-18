import { describe, it, expect } from 'vitest'
import { buildReceiptLines, receiptSubtotal, formatNumberBR } from '../receipt'

describe('buildReceiptLines', () => {
  it('serviço avulso mostra o preço unitário e cobra preço x quantidade', () => {
    const [one, two] = buildReceiptLines([
      { id: 'a', serviceName: 'Limpeza', price: '50', quantity: 1 },
      { id: 'b', serviceName: 'Regulagem', price: 30, quantity: 2 },
    ])
    expect(one).toMatchObject({ detail: '50,00', amount: 50 })
    expect(two).toMatchObject({ detail: '2x 30,00', amount: 60 })
  })

  it('serviço coberto pelo pacote sai como PACOTE e não cobra', () => {
    const [line] = buildReceiptLines([
      { id: 'a', serviceName: 'Lavagem', price: 40, quantity: 1, packageUsage: { quantity: 1 } },
    ])
    expect(line).toMatchObject({ detail: 'PACOTE', amount: 0 })
  })

  it('pacote parcial cobra só o que excede', () => {
    const [line] = buildReceiptLines([
      { id: 'a', serviceName: 'Lavagem', price: 40, quantity: 3, packageUsage: { quantity: 1 } },
    ])
    expect(line).toMatchObject({ detail: '2x 40,00 + 1 PACOTE', amount: 80 })
  })

  it('produtos entram depois dos serviços', () => {
    const lines = buildReceiptLines(
      [{ id: 'a', serviceName: 'Limpeza', price: 50, quantity: 1 }],
      [{ id: 'p', name: 'Pneu', quantity: 2, unitPrice: '650' }]
    )
    expect(lines.map((l) => l.key)).toEqual(['s-a', 'p-p'])
    expect(lines[1]).toMatchObject({ detail: '2x 650,00', amount: 1300 })
    expect(receiptSubtotal(lines)).toBe(1350)
  })
})

describe('formatNumberBR', () => {
  it('usa separadores brasileiros e duas casas', () => {
    expect(formatNumberBR(1234.5)).toBe('1.234,50')
  })
})
