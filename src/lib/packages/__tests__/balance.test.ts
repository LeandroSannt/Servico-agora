import { describe, it, expect } from 'vitest'
import {
  remainingOf,
  toBalances,
  computeBalance,
  aggregateServiceBalances,
  type PackageWithUsages,
} from '@/lib/packages/balance'

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
  it('desempata soldAt igual por id', () => {
    const same = d('2026-03-01')
    const x: PackageWithUsages = { id: 'X', quantity: 1, soldAt: same, usages: [] }
    const y: PackageWithUsages = { id: 'Y', quantity: 2, soldAt: same, usages: [] }
    expect(toBalances([y, x])).toEqual([
      { id: 'X', remaining: 1 },
      { id: 'Y', remaining: 2 },
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

describe('aggregateServiceBalances', () => {
  const svcA = { id: 'sA', name: 'Corte' }
  const svcB = { id: 'sB', name: 'Barba' }
  const withSvc = (p: PackageWithUsages, service: { id: string; name: string }) => ({ ...p, service })

  it('soma pacotes do mesmo servico', () => {
    expect(aggregateServiceBalances([withSvc(pkgA, svcA), withSvc(pkgB, svcA)])).toEqual([
      { serviceId: 'sA', serviceName: 'Corte', remaining: 10 },
    ])
  })
  it('omite pacote totalmente usado', () => {
    const used = withSvc({ ...pkgB, usages: [{ quantity: 5, orderId: 'x' }] }, svcA)
    expect(aggregateServiceBalances([withSvc(pkgA, svcA), used])).toEqual([
      { serviceId: 'sA', serviceName: 'Corte', remaining: 5 },
    ])
  })
  it('servico com todos os pacotes usados nao aparece', () => {
    const used = withSvc({ ...pkgB, usages: [{ quantity: 5, orderId: 'x' }] }, svcA)
    expect(aggregateServiceBalances([used])).toEqual([])
  })
  it('mantem servicos separados na ordem de primeira aparicao', () => {
    expect(aggregateServiceBalances([withSvc(pkgB, svcB), withSvc(pkgA, svcA)])).toEqual([
      { serviceId: 'sB', serviceName: 'Barba', remaining: 5 },
      { serviceId: 'sA', serviceName: 'Corte', remaining: 5 },
    ])
  })
})
