import { Prisma } from '@prisma/client'
import type { AuthUser } from '@/lib/auth-utils'

export interface DashboardScope {
  orderWhere: Prisma.ServiceOrderWhereInput
  clientWhere: Prisma.ClientWhereInput
}

/** Filtros pedidos pela tela (query string); só valem dentro do que o perfil já pode ver. */
export interface ScopeFilters {
  companyId?: string | null
  storeId?: string | null
}

/**
 * Filtro de visibilidade do dashboard por perfil.
 * SUPER_ADMIN: tudo (pode filtrar por empresa e/ou loja).
 * COMPANY_ADMIN e MANAGER: a própria empresa (pode filtrar por loja dentro dela).
 * EMPLOYEE: a própria loja (filtros ignorados).
 * Os filtros são sempre combinados (AND) com o escopo do perfil, nunca o substituem.
 */
export function getDashboardScope(user: AuthUser, filters: ScopeFilters = {}): DashboardScope {
  const companyId = filters.companyId || undefined
  const storeId = filters.storeId || undefined

  if (user.role === 'SUPER_ADMIN') {
    const where: Record<string, unknown> = {}
    if (companyId) where.store = { companyId }
    if (storeId) where.storeId = storeId
    return { orderWhere: where, clientWhere: where }
  }
  if (user.role === 'COMPANY_ADMIN' || user.role === 'MANAGER') {
    const where: Record<string, unknown> = user.companyId ? { store: { companyId: user.companyId } } : {}
    if (storeId) where.storeId = storeId
    return { orderWhere: where, clientWhere: where }
  }
  const where = user.storeId ? { storeId: user.storeId } : {}
  return { orderWhere: where, clientWhere: where }
}
