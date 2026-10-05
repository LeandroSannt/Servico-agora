import { describe, it, expect } from 'vitest'
import { remainingOf, toBalances, computeBalance, type PackageWithUsages } from '@/lib/packages/balance'

const d = (s: string) => new Date(s)

const pkgA: PackageWithUsages = {
  id: 'A', quantity: 10, soldAt: d('2026-01-01'),
  usages: [{ quantity: 3, orderId: 'os1' }, { quantity: 2, orderId: 'os2' }],
}
const pkgB: PackageWithUsages = { id: 'B', quantity: 5, soldAt: d('2026-02-01'), usages: [] }

describe('remainingOf', () => {
  it('quantidade menos consumos', () => {
    expect(remainingOf(pkgA)).toBe(5)
  })
  it('saldo zero quando tudo consumido', () => {
    expect(remainingOf({ ...pkgB, usages: [{ quantity: 5, orderId: 'x' }] })).toBe(0)
  })
  it('ignora consumos da OS em edição', () => {
    expect(remainingOf(pkgA, 'os1')).toBe(8)
  })
})

describe('toBalances', () => {
  it('ordena por soldAt asc e devolve id + remaining', () => {
    expect(toBalances([pkgB, pkgA])).toEqual([
      { id: 'A', remaining: 5 },
      { id: 'B', remaining: 5 },
    ])
  })
  it('exclui pacotes zerados', () => {
    expect(toBalances([{ ...pkgB, usages: [{ quantity: 5, orderId: 'x' }] }])).toEqual([])
  })
})

describe('computeBalance', () => {
  it('soma os saldos', () => {
    expect(computeBalance([pkgA, pkgB])).toBe(10)
  })
  it('lista vazia é zero', () => {
    expect(computeBalance([])).toBe(0)
  })
  it('credita consumo da OS em edição', () => {
    expect(computeBalance([pkgA, pkgB], 'os2')).toBe(12)
  })
})
