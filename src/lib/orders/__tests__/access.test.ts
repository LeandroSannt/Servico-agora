import { describe, it, expect, vi } from 'vitest'
import { canAccessOrder } from '../access'

// access.ts importa o Prisma e o NextAuth; só a regra pura é testada aqui (vi.mock é içado)
vi.mock('@/lib/prisma', () => ({ default: {} }))
vi.mock('@/lib/auth-utils', () => ({ requireAuth: vi.fn() }))

describe('canAccessOrder', () => {
  it('SUPER_ADMIN acessa OS de qualquer empresa', () => {
    expect(canAccessOrder({ role: 'SUPER_ADMIN', companyId: null }, { companyId: 'c2' })).toBe(true)
  })
  it('demais perfis acessam OS da própria empresa (qualquer loja dela)', () => {
    for (const role of ['COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE'] as const) {
      expect(canAccessOrder({ role, companyId: 'c1' }, { companyId: 'c1' })).toBe(true)
    }
  })
  it('bloqueia OS de outra empresa', () => {
    for (const role of ['COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE'] as const) {
      expect(canAccessOrder({ role, companyId: 'c1' }, { companyId: 'c2' })).toBe(false)
    }
  })
  it('bloqueia usuário sem empresa que não é SUPER_ADMIN', () => {
    expect(canAccessOrder({ role: 'EMPLOYEE', companyId: null }, { companyId: 'c1' })).toBe(false)
  })
})
