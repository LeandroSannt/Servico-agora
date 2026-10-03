import { Prisma } from '@prisma/client'
import type { AuthUser } from '@/lib/auth-utils'

export interface DashboardScope {
  orderWhere: Prisma.ServiceOrderWhereInput
  clientWhere: Prisma.ClientWhereInput
}

/**
 * Filtro de visibilidade do dashboard por perfil.
 * SUPER_ADMIN: tudo. COMPANY_ADMIN e MANAGER: a própria empresa.
 * EMPLOYEE: a própria loja.
 */
export function getDashboardScope(user: AuthUser): DashboardScope {
  if (user.role === 'SUPER_ADMIN') {
    return { orderWhere: {}, clientWhere: {} }
  }
  if (user.role === 'COMPANY_ADMIN' || user.role === 'MANAGER') {
    const where = user.companyId ? { store: { companyId: user.companyId } } : {}
    return { orderWhere: where, clientWhere: where }
  }
  const where = user.storeId ? { storeId: user.storeId } : {}
  return { orderWhere: where, clientWhere: where }
}
