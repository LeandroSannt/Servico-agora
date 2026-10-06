import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, type AuthUser } from '@/lib/auth-utils'
import { denyIfNoStoreAccess } from '@/lib/packages/store-access'

type Access = { error: NextResponse; user?: never; client?: never } | { error: null; user: AuthUser; client: { id: string } }

/** Login + cliente existente + loja do cliente acessível ao usuário (mesma regra de pacotes). */
export async function requireClientAccess(clientId: string, verb?: string): Promise<Access> {
  const { user, error } = await requireAuth()
  if (error) return { error }
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, store: { select: { id: true, companyId: true } } },
  })
  if (!client) return { error: NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 }) }
  const denied = denyIfNoStoreAccess(user!, client.store, verb)
  if (denied) return { error: denied }
  return { error: null, user: user!, client: { id: client.id } }
}
