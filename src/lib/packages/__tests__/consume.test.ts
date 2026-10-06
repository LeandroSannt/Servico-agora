import { describe, it, expect } from 'vitest'
import type { Prisma } from '@prisma/client'
import { computeOrderTotal, createOrderItemsWithPackages } from '@/lib/packages/consume'
import { InvalidPackageUsageError } from '@/lib/packages/errors'
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

  it('soma os produtos (quantidade x preço unitário)', () => {
    expect(
      computeOrderTotal(
        [{ serviceName: 'Limpeza', price: 30, quantity: 3, usePackageQuantity: 2 }],
        [
          { quantity: 2, unitPrice: 15.5 },
          { quantity: 1, unitPrice: 9.9 },
        ]
      )
    ).toBe(70.9)
  })

  it('OS só com produtos', () => {
    expect(computeOrderTotal([], [{ quantity: 3, unitPrice: 0.1 }])).toBe(0.3)
  })
})

describe('createOrderItemsWithPackages: guarda de entrada', () => {
  // tx mínimo: sem pacotes travados/lidos; nenhuma escrita deve acontecer antes da guarda
  const tx = {
    $queryRaw: async () => [],
    clientPackage: { findMany: async () => [] },
  } as unknown as Prisma.TransactionClient

  it('lança InvalidPackageUsageError quando usePackageQuantity > quantity', async () => {
    await expect(
      createOrderItemsWithPackages(tx, {
        orderId: 'o', clientId: 'c',
        items: [{ serviceId: 'svc', serviceName: 'Limpeza', price: 30, quantity: 2, usePackageQuantity: 3 }],
      })
    ).rejects.toBeInstanceOf(InvalidPackageUsageError)
  })

  it('lança InvalidPackageUsageError quando usa pacote sem serviceId', async () => {
    await expect(
      createOrderItemsWithPackages(tx, {
        orderId: 'o', clientId: 'c',
        items: [{ serviceId: '  ', serviceName: 'Avulso', price: 30, quantity: 2, usePackageQuantity: 1 }],
      })
    ).rejects.toBeInstanceOf(InvalidPackageUsageError)
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
