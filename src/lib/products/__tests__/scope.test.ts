import { describe, it, expect } from 'vitest'
import { productScopeWhere } from '../scope'

describe('productScopeWhere', () => {
  it('SUPER_ADMIN vê tudo e aceita storeId', () => {
    expect(productScopeWhere({ role: 'SUPER_ADMIN', companyId: null, storeId: null })).toEqual({})
    expect(productScopeWhere({ role: 'SUPER_ADMIN', companyId: null, storeId: null }, 's2')).toEqual({ storeId: 's2' })
  })
  it('COMPANY_ADMIN limitado à empresa', () => {
    expect(productScopeWhere({ role: 'COMPANY_ADMIN', companyId: 'c1', storeId: null }, 's2')).toEqual({
      store: { companyId: 'c1' },
      storeId: 's2',
    })
  })
  it('MANAGER e EMPLOYEE limitados à própria loja', () => {
    for (const role of ['MANAGER', 'EMPLOYEE'] as const) {
      expect(productScopeWhere({ role, companyId: 'c1', storeId: 's1' }, 'outra')).toEqual({ storeId: 's1' })
    }
  })
})
