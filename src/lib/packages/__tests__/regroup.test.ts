import { describe, it, expect } from 'vitest'
import { regroupOrderItems, catalogPriceFromItems, type IncomingOrderItem } from '@/lib/packages/regroup'

const noCatalog = () => undefined

function item(overrides: Partial<IncomingOrderItem>): IncomingOrderItem {
  return {
    serviceId: 'svc-a',
    serviceName: 'Limpeza',
    description: null,
    price: 30,
    quantity: 1,
    packageUsage: null,
    ...overrides,
  }
}

describe('regroupOrderItems', () => {
  it('itens comuns ficam iguais, preservando serviceId e convertendo preço Decimal-string', () => {
    const result = regroupOrderItems(
      [
        item({ serviceId: 'svc-a', price: '30.50', quantity: 2, description: 'Completa' }),
        item({ serviceId: null, serviceName: 'Avulso', price: 10 }),
      ],
      noCatalog
    )
    expect(result).toEqual([
      {
        serviceId: 'svc-a',
        serviceName: 'Limpeza',
        description: 'Completa',
        price: 30.5,
        quantity: 2,
        saveGlobally: false,
        isExisting: true,
        usePackageQuantity: 0,
        equipmentIds: [],
      },
      {
        serviceId: '',
        serviceName: 'Avulso',
        description: '',
        price: 10,
        quantity: 1,
        saveGlobally: false,
        isExisting: true,
        usePackageQuantity: 0,
        equipmentIds: [],
      },
    ])
  })

  it('coberto 2 + cobrado 1 do mesmo serviço vira um item qtd 3, uso 2, preço do irmão cobrado', () => {
    const result = regroupOrderItems(
      [
        item({ price: 0, quantity: 2, packageUsage: { quantity: 2 } }),
        item({ price: '35', quantity: 1 }),
      ],
      () => 99
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ serviceId: 'svc-a', quantity: 3, usePackageQuantity: 2, price: 35 })
  })

  it('cobertura dividida em dois pacotes (2 linhas) + cobrado 1 soma quantidade e uso', () => {
    const result = regroupOrderItems(
      [
        item({ price: 0, quantity: 1, packageUsage: { quantity: 1 } }),
        item({ price: 0, quantity: 2, packageUsage: { quantity: 2 } }),
        item({ price: 30, quantity: 1 }),
      ],
      noCatalog
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ quantity: 4, usePackageQuantity: 3, price: 30 })
  })

  it('totalmente coberto (sem irmão cobrado) usa o preço do catálogo', () => {
    const result = regroupOrderItems(
      [item({ price: 0, quantity: 2, packageUsage: { quantity: 2 } })],
      (id) => (id === 'svc-a' ? 42 : undefined)
    )
    expect(result).toEqual([
      expect.objectContaining({ quantity: 2, usePackageQuantity: 2, price: 42 }),
    ])
  })

  it('totalmente coberto e sem preço no catálogo fica com preço 0', () => {
    const result = regroupOrderItems(
      [item({ price: 0, quantity: 2, packageUsage: { quantity: 2 } })],
      noCatalog
    )
    expect(result[0]).toMatchObject({ quantity: 2, usePackageQuantity: 2, price: 0 })
  })

  it('serviços diferentes ficam separados', () => {
    const result = regroupOrderItems(
      [
        item({ serviceId: 'svc-a', price: 0, quantity: 1, packageUsage: { quantity: 1 } }),
        item({ serviceId: 'svc-b', serviceName: 'Polimento', price: 50, quantity: 1 }),
      ],
      () => 30
    )
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ serviceId: 'svc-a', quantity: 1, usePackageQuantity: 1, price: 30 })
    expect(result[1]).toMatchObject({ serviceId: 'svc-b', quantity: 1, usePackageQuantity: 0, price: 50 })
  })

  it('dois itens cobrados do mesmo serviço sem pacote continuam separados', () => {
    const result = regroupOrderItems([item({ quantity: 1 }), item({ quantity: 2 })], noCatalog)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.quantity)).toEqual([1, 2])
  })

  it('cobrado de A seguido de coberto de A: ficam separados (linha cobrada nunca absorve cobertas seguintes)', () => {
    const result = regroupOrderItems(
      [
        item({ price: 30, quantity: 1 }),
        item({ price: 0, quantity: 2, packageUsage: { quantity: 2 } }),
      ],
      () => 99
    )
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ serviceId: 'svc-a', quantity: 1, usePackageQuantity: 0, price: 30 })
    expect(result[1]).toMatchObject({ serviceId: 'svc-a', quantity: 2, usePackageQuantity: 2, price: 99 })
  })

  it('grupo absorve no máximo UMA linha cobrada: [coberto 1, cobrado 1 a 30, cobrado 1 a 50] vira duas linhas', () => {
    const result = regroupOrderItems(
      [
        item({ price: 0, quantity: 1, packageUsage: { quantity: 1 } }),
        item({ price: 30, quantity: 1 }),
        item({ price: 50, quantity: 1 }),
      ],
      noCatalog
    )
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ serviceId: 'svc-a', quantity: 2, usePackageQuantity: 1, price: 30 })
    expect(result[1]).toMatchObject({ serviceId: 'svc-a', quantity: 1, usePackageQuantity: 0, price: 50 })
  })

  it('coberto em dois pacotes + um cobrado vira um único item', () => {
    const result = regroupOrderItems(
      [
        item({ price: 0, quantity: 2, packageUsage: { quantity: 2 } }),
        item({ price: 0, quantity: 1, packageUsage: { quantity: 1 } }),
        item({ price: 40, quantity: 2 }),
      ],
      noCatalog
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ quantity: 5, usePackageQuantity: 3, price: 40 })
  })

  it('a descrição do grupo vem da linha cobrada quando a coberta não tem', () => {
    const result = regroupOrderItems(
      [
        item({ price: 0, quantity: 1, description: null, packageUsage: { quantity: 1 } }),
        item({ price: 30, quantity: 1, description: 'Completa' }),
      ],
      noCatalog
    )
    expect(result[0]).toMatchObject({ description: 'Completa', quantity: 2 })
  })

  it('coberto seguido de cobrado de OUTRO serviço não absorve', () => {
    const result = regroupOrderItems(
      [
        item({ serviceId: 'svc-a', price: 0, quantity: 1, packageUsage: { quantity: 1 } }),
        item({ serviceId: 'svc-b', price: 50, quantity: 1 }),
      ],
      noCatalog
    )
    expect(result).toHaveLength(2)
  })

  const eq = (...ids: string[]) => ids.map((id) => ({ equipment: { id } }))

  it('leva os equipmentIds (ordenados) do grupo', () => {
    const result = regroupOrderItems(
      [
        item({ price: 0, quantity: 2, packageUsage: { quantity: 2 }, equipments: eq('e2', 'e1') }),
        item({ price: 30, quantity: 1, equipments: eq('e1', 'e2') }),
      ],
      noCatalog
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ quantity: 3, usePackageQuantity: 2, equipmentIds: ['e1', 'e2'] })
  })

  it('não funde coberto e cobrado do mesmo serviço com equipamentos diferentes', () => {
    const result = regroupOrderItems(
      [
        item({ price: 0, quantity: 1, packageUsage: { quantity: 1 }, equipments: eq('e1') }),
        item({ price: 30, quantity: 1, equipments: eq('e2') }),
      ],
      noCatalog
    )
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.equipmentIds)).toEqual([['e1'], ['e2']])
  })

  it('não funde duas cobertas com equipamentos diferentes', () => {
    const result = regroupOrderItems(
      [
        item({ price: 0, quantity: 1, packageUsage: { quantity: 1 }, equipments: eq('e1') }),
        item({ price: 0, quantity: 1, packageUsage: { quantity: 1 }, equipments: eq('e2') }),
      ],
      noCatalog
    )
    expect(result).toHaveLength(2)
  })
})

describe('catalogPriceFromItems', () => {
  it('usa o preço do serviço vinculado (Decimal-string vira número)', () => {
    const lookup = catalogPriceFromItems([
      { serviceId: 'svc-a', service: { price: '42.50' } },
      { serviceId: 'svc-b', service: null },
      { serviceId: null },
    ])
    expect(lookup('svc-a')).toBe(42.5)
    expect(lookup('svc-b')).toBeUndefined()
    expect(lookup('svc-x')).toBeUndefined()
  })
})
