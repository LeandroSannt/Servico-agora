import { describe, it, expect } from 'vitest'
import { orderServiceSchema, serviceOrderSchema, orderProductSchema } from '@/lib/validations/order'

describe('orderServiceSchema.quantity', () => {
  const base = { serviceName: 'Limpeza', price: 30 }

  it('aceita quantidade inteira', () => {
    expect(orderServiceSchema.safeParse({ ...base, quantity: 3 }).success).toBe(true)
  })

  it('rejeita quantidade fracionária (coluna Int)', () => {
    const r = orderServiceSchema.safeParse({ ...base, quantity: 1.5 })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Quantidade deve ser inteira')
  })
})

describe('serviceOrderSchema: serviços e produtos', () => {
  const base = { clientId: 'c1', storeId: 's1' }
  const service = { serviceName: 'Limpeza', price: 30, quantity: 1 }
  const product = { name: 'Corrente', quantity: 1, unitPrice: 50 }

  it('aceita OS só com produto', () => {
    const r = serviceOrderSchema.safeParse({ ...base, services: [], products: [product] })
    expect(r.success).toBe(true)
  })

  it('products é opcional e vira []', () => {
    const r = serviceOrderSchema.safeParse({ ...base, services: [service] })
    expect(r.success).toBe(true)
    expect(r.data?.products).toEqual([])
  })

  it('rejeita OS sem serviço e sem produto, com o erro em services', () => {
    const r = serviceOrderSchema.safeParse({ ...base, services: [], products: [] })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Adicione pelo menos um serviço ou produto')
    expect(r.error?.issues[0].path).toEqual(['services'])
  })

  it('normaliza equipmentIds duplicados', () => {
    const r = serviceOrderSchema.safeParse({
      ...base,
      services: [{ ...service, equipmentIds: ['e1', 'e2', 'e1'] }],
    })
    expect(r.data?.services[0].equipmentIds).toEqual(['e1', 'e2'])
  })
})

describe('orderProductSchema', () => {
  it('rejeita nome vazio', () => {
    const r = orderProductSchema.safeParse({ name: '  ', quantity: 1, unitPrice: 10 })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Nome do produto é obrigatório')
  })

  it('rejeita preço negativo', () => {
    expect(orderProductSchema.safeParse({ name: 'X', quantity: 1, unitPrice: -1 }).success).toBe(false)
  })

  it('arredonda o preço a centavos', () => {
    expect(orderProductSchema.parse({ name: 'X', quantity: 1, unitPrice: 15.555 }).unitPrice).toBe(15.56)
  })

  it('rejeita quantidade 0 ou fracionária', () => {
    expect(orderProductSchema.safeParse({ name: 'X', quantity: 0, unitPrice: 1 }).success).toBe(false)
    expect(orderProductSchema.safeParse({ name: 'X', quantity: 1.5, unitPrice: 1 }).success).toBe(false)
  })

  it('mensagens em português para quantidade e preço vazios (NaN)', () => {
    const q = orderProductSchema.safeParse({ name: 'X', quantity: NaN, unitPrice: 1 })
    expect(q.success).toBe(false)
    expect(q.error?.issues[0].message).toBe('Informe a quantidade')
    const p = orderProductSchema.safeParse({ name: 'X', quantity: 1, unitPrice: NaN })
    expect(p.success).toBe(false)
    expect(p.error?.issues[0].message).toBe('Informe o preço')
  })
})
