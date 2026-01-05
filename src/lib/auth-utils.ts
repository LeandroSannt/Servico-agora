import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'EMPLOYEE'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  companyId: string | null
  storeId: string | null
}

/**
 * Obtém o usuário autenticado da sessão
 * Retorna null se não estiver autenticado
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await auth()
  if (!session?.user) return null

  return {
    id: session.user.id,
    name: session.user.name || '',
    email: session.user.email || '',
    role: session.user.role as UserRole,
    companyId: session.user.companyId,
    storeId: session.user.storeId,
  }
}

/**
 * Middleware para verificar autenticação em API routes
 * Retorna erro 401 se não autenticado
 */
export async function requireAuth() {
  const user = await getAuthUser()
  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      ),
    }
  }
  return { user, error: null }
}

/**
 * Middleware para verificar roles específicas
 */
export async function requireRoles(allowedRoles: UserRole[]) {
  const { user, error } = await requireAuth()
  if (error) return { user: null, error }

  if (!allowedRoles.includes(user!.role)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      ),
    }
  }
  return { user, error: null }
}

/**
 * Retorna o filtro de company baseado no role do usuário
 * SUPER_ADMIN: vê todas as companies
 * Outros: vê apenas a própria company
 */
export function getCompanyFilter(user: AuthUser): { companyId?: string } {
  if (user.role === 'SUPER_ADMIN') {
    return {}
  }
  return user.companyId ? { companyId: user.companyId } : {}
}

/**
 * Retorna o filtro de store baseado no role do usuário
 * SUPER_ADMIN/COMPANY_ADMIN/MANAGER: vê todas as stores da company
 * EMPLOYEE: vê apenas a própria store
 */
export function getStoreFilter(user: AuthUser): { storeId?: string } {
  if (['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'].includes(user.role)) {
    return {}
  }
  return user.storeId ? { storeId: user.storeId } : {}
}
