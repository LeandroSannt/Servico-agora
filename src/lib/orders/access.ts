import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, type AuthUser } from '@/lib/auth-utils'

type Viewer = Pick<AuthUser, 'role' | 'companyId'>

/**
 * Mesma visibilidade da listagem de OS (GET /api/orders): SUPER_ADMIN vê todas;
 * os demais perfis veem as OS das lojas da própria empresa.
 */
export function canAccessOrder(user: Viewer, store: { companyId: string }): boolean {
  if (user.role === 'SUPER_ADMIN') return true
  return !!user.companyId && store.companyId === user.companyId
}

type Access = { error: NextResponse; user?: never } | { error: null; user: AuthUser }

/** Login + OS existente e visível ao usuário. OS de outra empresa responde como inexistente. */
export async function requireOrderAccess(orderId: string): Promise<Access> {
  const { user, error } = await requireAuth()
  if (error) return { error }
  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    select: { store: { select: { companyId: true } } },
  })
  if (!order || !canAccessOrder(user!, order.store)) {
    return { error: NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 }) }
  }
  return { error: null, user: user! }
}
