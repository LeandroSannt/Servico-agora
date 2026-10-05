import { describe, it, expect } from 'vitest'
import { allocateFifo } from '@/lib/packages/allocate'
import { InsufficientBalanceError } from '@/lib/packages/errors'

const balances = [
  { id: 'A', remaining: 2 },
  { id: 'B', remaining: 5 },
]

describe('allocateFifo', () => {
  it('consome do pacote mais antigo primeiro', () => {
    const r = allocateFifo(balances, 2, 'svc')
    expect(r.allocations).toEqual([{ clientPackageId: 'A', quantity: 2 }])
    expect(r.balances).toEqual([{ id: 'B', remaining: 5 }])
  })
  it('atravessa dois pacotes', () => {
    const r = allocateFifo(balances, 3, 'svc')
    expect(r.allocations).toEqual([
      { clientPackageId: 'A', quantity: 2 },
      { clientPackageId: 'B', quantity: 1 },
    ])
    expect(r.balances).toEqual([{ id: 'B', remaining: 4 }])
  })
  it('quantidade zero não aloca nada', () => {
    const r = allocateFifo(balances, 0, 'svc')
    expect(r.allocations).toEqual([])
    expect(r.balances).toEqual(balances)
  })
  it('lança erro com o saldo restante quando excede', () => {
    expect(() => allocateFifo(balances, 8, 'svc')).toThrowError(InsufficientBalanceError)
    try {
      allocateFifo(balances, 8, 'svc')
    } catch (e) {
      const err = e as InsufficientBalanceError
      expect(err.serviceId).toBe('svc')
      expect(err.remaining).toBe(7)
    }
  })
  it('não muta a entrada', () => {
    const input = balances.map((b) => ({ ...b }))
    allocateFifo(input, 3, 'svc')
    expect(input).toEqual(balances)
  })
})
