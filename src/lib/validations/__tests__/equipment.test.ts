import { describe, it, expect } from 'vitest'
import { equipmentSchema, updateEquipmentSchema } from '@/lib/validations/equipment'

describe('equipmentSchema', () => {
  it('exige nome', () => {
    const r = equipmentSchema.safeParse({ name: ' ' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Nome do equipamento é obrigatório')
  })

  it('campos opcionais vazios viram null e o nome é aparado', () => {
    const r = equipmentSchema.safeParse({ name: ' Split sala ', brand: '', model: '  ', serialNumber: 'AB1', color: ' Azul ' })
    expect(r.data).toEqual({ name: 'Split sala', brand: null, model: null, serialNumber: 'AB1', color: 'Azul', notes: null })
  })
})

describe('updateEquipmentSchema', () => {
  it('aceita só isActive (reativar) sem apagar os outros campos', () => {
    expect(updateEquipmentSchema.safeParse({ isActive: true }).data).toEqual({ isActive: true })
  })

  it('string vazia limpa o campo', () => {
    expect(updateEquipmentSchema.safeParse({ brand: '' }).data).toEqual({ brand: null })
  })
})

describe('tags no schema de equipamento', () => {
  it('PATCH sem tags deixa tags indefinido (não altera)', () => {
    expect(updateEquipmentSchema.parse({ color: 'Azul' }).tags).toBeUndefined()
  })
  it('PATCH com [] mantém [] (limpa o conjunto)', () => {
    expect(updateEquipmentSchema.parse({ tags: [] }).tags).toEqual([])
  })
  it('deduplica sem diferenciar maiúsculas e apara', () => {
    expect(updateEquipmentSchema.parse({ tags: [' Inverter ', 'inverter', '220V', ''] }).tags).toEqual(['Inverter', '220V'])
    expect(equipmentSchema.parse({ name: 'X', tags: ['A', 'a'] }).tags).toEqual(['A'])
  })
  it('POST sem tags fica indefinido', () => {
    expect(equipmentSchema.parse({ name: 'X' }).tags).toBeUndefined()
  })
  it('rejeita característica acima de 60 caracteres', () => {
    expect(equipmentSchema.safeParse({ name: 'X', tags: ['a'.repeat(61)] }).success).toBe(false)
  })
})
