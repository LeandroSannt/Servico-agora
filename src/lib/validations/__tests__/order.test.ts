import { describe, it, expect } from 'vitest'
import { orderServiceSchema } from '@/lib/validations/order'

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
