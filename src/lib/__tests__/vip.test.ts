import { describe, it, expect } from 'vitest'
import { orderTotalFor, normalizeVipCompanyName } from '../vip'

describe('orderTotalFor', () => {
  it('zera o total de OS VIP', () => expect(orderTotalFor(150.5, true)).toBe(0))
  it('mantém o total de OS comum', () => expect(orderTotalFor(150.5, false)).toBe(150.5))
})

describe('normalizeVipCompanyName', () => {
  it('limpa quando não é VIP', () => expect(normalizeVipCompanyName(false, 'ACME')).toBeNull())
  it('apara espaços quando VIP', () => expect(normalizeVipCompanyName(true, '  ACME ')).toBe('ACME'))
  it('vazio vira null', () => expect(normalizeVipCompanyName(true, '   ')).toBeNull())
  it('undefined vira null', () => expect(normalizeVipCompanyName(true, undefined)).toBeNull())
})
