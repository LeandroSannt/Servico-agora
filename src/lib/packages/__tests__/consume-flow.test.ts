import { describe, it, expect } from 'vitest'
import { allocateFifo } from '@/lib/packages/allocate'
import { splitOrderItem, type OrderItemInput } from '@/lib/packages/split'
import { InsufficientBalanceError } from '@/lib/packages/errors'

// Contrato de uso esperado na rota: alocar por item, carregando os saldos
// restantes para o próximo item do mesmo serviço, e dividir cada item.
describe('fluxo de consumo (alocar + dividir) com vários itens do mesmo serviço', () => {
  it('consome FIFO entre itens, divide cada um e falha quando o saldo acaba', () => {
    let balances = [
      { id: 'A', remaining: 2 },
      { id: 'B', remaining: 5 },
    ]
    const line = (quantity: number, usePackageQuantity: number): OrderItemInput => ({
      serviceId: 'svc', serviceName: 'Limpeza', price: 30, quantity, usePackageQuantity,
    })

    const item1 = line(3, 3)
    const r1 = allocateFifo(balances, item1.usePackageQuantity!, 'svc')
    balances = r1.balances
    const out1 = splitOrderItem(item1, r1.allocations)
    expect(out1.map((o) => [o.allocation?.clientPackageId, o.quantity, o.price])).toEqual([
      ['A', 2, 0],
      ['B', 1, 0],
    ])

    const item2 = line(5, 4)
    const r2 = allocateFifo(balances, item2.usePackageQuantity!, 'svc')
    balances = r2.balances
    const out2 = splitOrderItem(item2, r2.allocations)
    expect(out2.map((o) => [o.allocation?.clientPackageId, o.quantity, o.price])).toEqual([
      ['B', 4, 0],
      [undefined, 1, 30],
    ])

    const item3 = line(1, 1)
    try {
      allocateFifo(balances, item3.usePackageQuantity!, 'svc')
      expect.unreachable('deveria lançar InsufficientBalanceError')
    } catch (e) {
      expect(e).toBeInstanceOf(InsufficientBalanceError)
      expect((e as InsufficientBalanceError).remaining).toBe(0)
    }
  })
})
