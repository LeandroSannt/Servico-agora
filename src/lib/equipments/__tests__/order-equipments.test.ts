import { describe, it, expect } from 'vitest'
import {
  collectEquipmentIds,
  invalidEquipmentIds,
  orderEquipmentNames,
  summarizeNames,
} from '@/lib/equipments/order-equipments'

describe('collectEquipmentIds', () => {
  it('junta os ids de todas as linhas sem repetir', () => {
    expect(collectEquipmentIds([{ equipmentIds: ['a', 'b'] }, { equipmentIds: ['b', 'c'] }, {}])).toEqual(['a', 'b', 'c'])
  })
})

describe('invalidEquipmentIds', () => {
  const owned = [
    { id: 'ativo', isActive: true },
    { id: 'arquivado', isActive: false },
  ]

  it('id que não é do cliente é inválido', () => {
    expect(invalidEquipmentIds(['ativo', 'outro'], owned, new Set())).toEqual(['outro'])
  })

  it('arquivado só é aceito se já estava vinculado à OS', () => {
    expect(invalidEquipmentIds(['arquivado'], owned, new Set())).toEqual(['arquivado'])
    expect(invalidEquipmentIds(['arquivado'], owned, new Set(['arquivado']))).toEqual([])
  })
})

describe('orderEquipmentNames', () => {
  it('nomes distintos na ordem da primeira aparição', () => {
    const services = [
      { equipments: [{ equipment: { id: '1', name: 'Split sala' } }, { equipment: { id: '2', name: 'Split quarto' } }] },
      { equipments: [{ equipment: { id: '1', name: 'Split sala' } }] },
      {},
    ]
    expect(orderEquipmentNames(services)).toEqual(['Split sala', 'Split quarto'])
  })
})

describe('summarizeNames', () => {
  it('vazio vira travessão', () => expect(summarizeNames([])).toBe('—'))
  it('até o máximo mostra todos', () => expect(summarizeNames(['A', 'B'])).toBe('A, B'))
  it('acima do máximo resume com +N', () => expect(summarizeNames(['A', 'B', 'C', 'D'])).toBe('A, B +2'))
})
