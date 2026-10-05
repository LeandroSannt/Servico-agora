import { describe, it, expect } from 'vitest'
import { computeOrderTotal } from '@/lib/packages/consume'
import { displayServiceName } from '@/lib/packages/order-include'

describe('computeOrderTotal', () => {
  it('sem pacote soma preço x quantidade de todos os itens', () => {
    expect(
      computeOrderTotal([
        { serviceName: 'A', price: 30, quantity: 3 },
        { serviceName: 'B', price: 10, quantity: 2 },
      ])
    ).toBe(110)
  })

  it('cobertura parcial cobra só o restante', () => {
    expect(computeOrderTotal([{ serviceName: 'Limpeza', price: 30, quantity: 3, usePackageQuantity: 2 }])).toBe(30)
  })

  it('cobertura total resulta em 0', () => {
    expect(computeOrderTotal([{ serviceName: 'Limpeza', price: 30, quantity: 3, usePackageQuantity: 3 }])).toBe(0)
  })

  it('usePackageQuantity maior que a quantidade nunca deixa o total negativo', () => {
    expect(computeOrderTotal([{ serviceName: 'Limpeza', price: 30, quantity: 3, usePackageQuantity: 5 }])).toBe(0)
  })
})

describe('displayServiceName', () => {
  it('acrescenta (pacote) quando coberto', () => {
    expect(displayServiceName({ serviceName: 'Limpeza', packageUsage: { quantity: 1 } })).toBe('Limpeza (pacote)')
  })

  it('mantém o nome quando não coberto', () => {
    expect(displayServiceName({ serviceName: 'Limpeza', packageUsage: null })).toBe('Limpeza')
  })
})
