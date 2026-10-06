import { describe, it, expect } from 'vitest'
import { buildVariables, toMetaParams } from '@/lib/whatsapp/message-data'

const base = {
  clientName: 'Maria',
  clientPhone: '11999990000',
  orderNumber: '1042',
  storeName: 'Loja',
  companyName: 'Empresa',
  companyId: 'c1',
  totalAmount: 50,
}

describe('buildVariables sem serviços (OS só com produtos)', () => {
  it('services e servicesMultiline usam "—"', () => {
    const v = buildVariables({ ...base, status: 'RECEIVED', services: [] })
    expect(v.services).toBe('—')
    expect(v.servicesMultiline).toBe('—')
  })

  it('nenhum parâmetro Meta fica vazio', () => {
    const v = buildVariables({ ...base, status: 'RECEIVED', services: [] })
    expect(toMetaParams('RECEIVED', v).every((p) => p.length > 0)).toBe(true)
  })
})
