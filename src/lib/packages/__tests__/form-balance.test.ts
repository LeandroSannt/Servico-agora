import { describe, it, expect } from 'vitest'
import {
  buildBalanceByService,
  computeEffectiveUse,
  availableBefore,
  syncUseWithQuantity,
} from '@/lib/packages/form-balance'

const usage = (orderId: string, quantity: number) => ({ quantity, order: { id: orderId } })

describe('buildBalanceByService', () => {
  it('usa os saldos como vieram quando não é edição', () => {
    const map = buildBalanceByService(
      [{ serviceId: 'a', remaining: 3 }],
      [{ serviceId: 'a', status: 'ACTIVE', usages: [usage('os-1', 2)] }],
      null
    )
    expect(map.get('a')).toBe(3)
  })

  it('na edição, os consumos da própria OS voltam a contar (mesmo sem saldo listado)', () => {
    const map = buildBalanceByService(
      [{ serviceId: 'a', remaining: 3 }],
      [
        { serviceId: 'a', status: 'ACTIVE', usages: [usage('os-1', 2), usage('os-2', 4)] },
        { serviceId: 'b', status: 'ACTIVE', usages: [usage('os-1', 1)] },
      ],
      'os-1'
    )
    expect(map.get('a')).toBe(5)
    expect(map.get('b')).toBe(1)
  })

  it('ignora consumos de pacote cancelado', () => {
    const map = buildBalanceByService(
      [{ serviceId: 'a', remaining: 0 }],
      [{ serviceId: 'a', status: 'CANCELLED', usages: [usage('os-1', 2)] }],
      'os-1'
    )
    expect(map.get('a')).toBe(0)
  })

  it('sem dados devolve mapa vazio', () => {
    expect(buildBalanceByService(undefined, undefined, 'os-1').size).toBe(0)
  })
})

describe('computeEffectiveUse', () => {
  const balances = new Map([['a', 5]])

  it('duas linhas do mesmo serviço: a segunda só leva o que sobrou', () => {
    const items = [
      { serviceId: 'a', quantity: 3, usePackageQuantity: 3 },
      { serviceId: 'a', quantity: 4, usePackageQuantity: 4 },
    ]
    expect(computeEffectiveUse(items, balances)).toEqual([3, 2])
  })

  it('limita à quantidade quando a quantidade cai abaixo do pedido', () => {
    expect(computeEffectiveUse([{ serviceId: 'a', quantity: 2, usePackageQuantity: 4 }], balances)).toEqual([2])
  })

  it('sem serviceId, sem pedido ou sem saldo devolve 0', () => {
    const items = [
      { serviceId: '', quantity: 1, usePackageQuantity: 1 },
      { serviceId: 'a', quantity: 1, usePackageQuantity: 0 },
      { serviceId: 'z', quantity: 1, usePackageQuantity: 1 },
    ]
    expect(computeEffectiveUse(items, balances)).toEqual([0, 0, 0])
  })
})

describe('availableBefore', () => {
  it('desconta o que as linhas anteriores do mesmo serviço já usam', () => {
    const balances = new Map([['a', 5], ['b', 2]])
    const items = [
      { serviceId: 'a', quantity: 3, usePackageQuantity: 3 },
      { serviceId: 'b', quantity: 1, usePackageQuantity: 1 },
      { serviceId: 'a', quantity: 4, usePackageQuantity: 0 },
      { serviceId: 'a', quantity: 1, usePackageQuantity: 1 },
    ]
    const use = computeEffectiveUse(items, balances)
    expect(availableBefore(items, use, 0, balances)).toBe(5)
    expect(availableBefore(items, use, 2, balances)).toBe(2)
    expect(availableBefore(items, use, 3, balances)).toBe(2)
  })

  it('segunda linha sem saldo restante fica em 0', () => {
    const balances = new Map([['a', 2]])
    const items = [
      { serviceId: 'a', quantity: 2, usePackageQuantity: 2 },
      { serviceId: 'a', quantity: 1, usePackageQuantity: 0 },
    ]
    expect(availableBefore(items, computeEffectiveUse(items, balances), 1, balances)).toBe(0)
  })
})

describe('syncUseWithQuantity', () => {
  it('não mexe em linha que não usa pacote', () => {
    expect(syncUseWithQuantity(0, 3, 5)).toBe(0)
  })
  it('acompanha a nova quantidade até o disponível', () => {
    expect(syncUseWithQuantity(1, 3, 5)).toBe(3)
    expect(syncUseWithQuantity(3, 7, 5)).toBe(5)
    expect(syncUseWithQuantity(5, 2, 5)).toBe(2)
  })
  it('sem saldo mantém a intenção (a nova quantidade); o uso efetivo limita depois', () => {
    expect(syncUseWithQuantity(2, 4, 0)).toBe(4)
  })
})
