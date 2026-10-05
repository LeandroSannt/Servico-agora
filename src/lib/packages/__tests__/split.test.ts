import { describe, it, expect } from 'vitest'
import { splitOrderItem, type OrderItemInput } from '@/lib/packages/split'

const item: OrderItemInput = {
  serviceId: 'svc',
  serviceName: 'Limpeza',
  description: 'Completa',
  price: 30,
  quantity: 3,
  saveGlobally: true,
}

describe('splitOrderItem', () => {
  it('sem alocação devolve o item como está', () => {
    expect(splitOrderItem(item, [])).toEqual([
      { serviceId: 'svc', serviceName: 'Limpeza', description: 'Completa', price: 30, quantity: 3, saveGlobally: true },
    ])
  })
  it('parcial: coberto a R$0 + cobrado com o resto', () => {
    expect(splitOrderItem(item, [{ clientPackageId: 'A', quantity: 2 }])).toEqual([
      { serviceId: 'svc', serviceName: 'Limpeza', description: 'Completa', price: 0, quantity: 2, saveGlobally: false, allocation: { clientPackageId: 'A', quantity: 2 } },
      { serviceId: 'svc', serviceName: 'Limpeza', description: 'Completa', price: 30, quantity: 1, saveGlobally: true },
    ])
  })
  it('totalmente coberto por dois pacotes vira dois itens a R$0 e nenhum cobrado', () => {
    const out = splitOrderItem(item, [
      { clientPackageId: 'A', quantity: 2 },
      { clientPackageId: 'B', quantity: 1 },
    ])
    expect(out).toHaveLength(2)
    expect(out.map((o) => o.price)).toEqual([0, 0])
    expect(out.map((o) => o.allocation?.clientPackageId)).toEqual(['A', 'B'])
  })
  it('descrição ausente vira null', () => {
    const out = splitOrderItem({ ...item, description: undefined }, [])
    expect(out[0].description).toBeNull()
  })
})
