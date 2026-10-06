import { describe, it, expect } from 'vitest'
import { equipmentSchema, updateEquipmentSchema } from '@/lib/validations/equipment'

describe('equipmentSchema', () => {
  it('exige nome', () => {
    const r = equipmentSchema.safeParse({ name: ' ' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Nome do equipamento é obrigatório')
  })

  it('campos opcionais vazios viram null e o nome é aparado', () => {
    const r = equipmentSchema.safeParse({ name: ' Split sala ', brand: '', model: '  ', serialNumber: 'AB1' })
    expect(r.data).toEqual({ name: 'Split sala', brand: null, model: null, serialNumber: 'AB1', notes: null })
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
