import { describe, it, expect } from 'vitest'
import { generateOrderPdf, type OrderPdfData } from '@/lib/pdf/generate-order-pdf'

const base: OrderPdfData = {
  orderNumber: '1042',
  clientName: 'Maria',
  clientPhone: '11999990000',
  storeName: 'Loja',
  companyName: 'Empresa',
  services: [],
  totalAmount: 0,
  createdAt: new Date('2026-10-06T12:00:00Z'),
}

// jsPDF sem compressão: o texto aparece literal no conteúdo
const text = (data: OrderPdfData) => generateOrderPdf(data).toString('latin1')

describe('generateOrderPdf', () => {
  it('OS só com produtos: sem cabeçalho de serviços, com tabela de produtos', () => {
    const out = text({ ...base, products: [{ name: 'Corrente', quantity: 2, unitPrice: 25 }], totalAmount: 50 })
    expect(out.startsWith('%PDF')).toBe(true)
    expect(out).not.toContain('SERVICOS REALIZADOS')
    expect(out).toContain('PRODUTOS')
    expect(out).toContain('Corrente')
  })

  it('mostra os equipamentos abaixo do serviço', () => {
    const out = text({
      ...base,
      services: [{ name: 'Limpeza', price: 30, quantity: 1, equipments: ['Split sala', 'Split quarto'] }],
      totalAmount: 30,
    })
    expect(out).toContain('SERVICOS REALIZADOS')
    expect(out).toContain('Equipamentos: Split sala, Split quarto')
    expect(out).not.toContain('PRODUTOS')
  })
})
