import { describe, it, expect } from 'vitest'
import { getDashboardScope } from '../dashboard-scope'
import type { AuthUser } from '../auth-utils'

const user = (over: Partial<AuthUser>) => ({ id: 'u', role: 'EMPLOYEE', companyId: null, storeId: null, ...over }) as AuthUser

describe('getDashboardScope', () => {
  it('SUPER_ADMIN sem filtro vê tudo', () => {
    expect(getDashboardScope(user({ role: 'SUPER_ADMIN' })).orderWhere).toEqual({})
  })
  it('SUPER_ADMIN filtra por empresa e loja', () => {
    const w = getDashboardScope(user({ role: 'SUPER_ADMIN' }), { companyId: 'c1', storeId: 's1' }).orderWhere
    expect(w).toEqual({ store: { companyId: 'c1' }, storeId: 's1' })
  })
  it('COMPANY_ADMIN ignora companyId pedido e mantém a própria empresa', () => {
    const w = getDashboardScope(user({ role: 'COMPANY_ADMIN', companyId: 'mine' }), { companyId: 'other' }).orderWhere
    expect(w).toEqual({ store: { companyId: 'mine' } })
  })
  it('COMPANY_ADMIN filtra por loja dentro da própria empresa', () => {
    const w = getDashboardScope(user({ role: 'COMPANY_ADMIN', companyId: 'mine' }), { storeId: 's2' }).orderWhere
    expect(w).toEqual({ store: { companyId: 'mine' }, storeId: 's2' })
  })
  it('EMPLOYEE fica na própria loja e ignora filtros', () => {
    const w = getDashboardScope(user({ role: 'EMPLOYEE', storeId: 's9' }), { companyId: 'c', storeId: 'x' }).orderWhere
    expect(w).toEqual({ storeId: 's9' })
  })
  it('valores vazios são ignorados', () => {
    const w = getDashboardScope(user({ role: 'SUPER_ADMIN' }), { companyId: '', storeId: null }).orderWhere
    expect(w).toEqual({})
  })
})
