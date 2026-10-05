import { describe, it, expect } from 'vitest'
import { withDerived } from '@/lib/packages/package-serializer'

describe('withDerived', () => {
  it('calcula preco unitario e economia', () => {
    const r = withDerived({ price: '250', quantity: 10, service: { price: '30' } })
    expect(r.price).toBe(250)
    expect(r.unitPrice).toBe(25)
    expect(r.savingsPercent).toBe(17)
  })
  it('pacote mais caro que o avulso da economia negativa sem quebrar', () => {
    const r = withDerived({ price: 400, quantity: 10, service: { price: 30 } })
    expect(r.savingsPercent).toBe(-33)
  })
  it('servico sem preco da economia zero', () => {
    expect(withDerived({ price: 100, quantity: 4, service: { price: 0 } }).savingsPercent).toBe(0)
  })
  it('converte service.price para numero e preserva os demais campos do servico', () => {
    const r = withDerived({ price: '250', quantity: 10, service: { price: '30.5', name: 'Corte', id: 's1' } })
    expect(typeof r.service.price).toBe('number')
    expect(r.service.price).toBe(30.5)
    expect(r.service.name).toBe('Corte')
    expect(r.service.id).toBe('s1')
  })
})
