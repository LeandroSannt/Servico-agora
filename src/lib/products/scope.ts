import type { AuthUser } from '@/lib/auth-utils'

/** Escopo de leitura do catálogo: SUPER_ADMIN tudo; COMPANY_ADMIN a empresa; demais a própria loja. */
export function productScopeWhere(
  user: Pick<AuthUser, 'role' | 'companyId' | 'storeId'>,
  requestedStoreId?: string | null
): Record<string, unknown> {
  const where: Record<string, unknown> = {}
  if (user.role === 'SUPER_ADMIN') {
    if (requestedStoreId) where.storeId = requestedStoreId
    return where
  }
  if (user.role === 'COMPANY_ADMIN') {
    // Sem empresa vinculada: não enxerga nada (nunca todas)
    where.store = { companyId: user.companyId ?? '__none__' }
    if (requestedStoreId) where.storeId = requestedStoreId
    return where
  }
  // MANAGER/EMPLOYEE: sempre a própria loja, ignorando o filtro pedido
  where.storeId = user.storeId ?? '__none__'
  return where
}
