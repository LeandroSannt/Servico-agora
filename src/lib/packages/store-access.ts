import { NextResponse } from 'next/server'
import type { AuthUser } from '@/lib/auth-utils'

/** Mesma regra das rotas de serviços/clientes. Devolve a resposta de erro ou null se pode. */
export function denyIfNoStoreAccess(
  user: AuthUser,
  store: { id: string; companyId: string },
  verb = 'acessar'
): NextResponse | null {
  if (user.role === 'SUPER_ADMIN') return null
  if (user.role === 'COMPANY_ADMIN') {
    return store.companyId === user.companyId
      ? null
      : NextResponse.json({ error: `Você não tem permissão para ${verb} esta loja` }, { status: 403 })
  }
  return user.storeId === store.id
    ? null
    : NextResponse.json({ error: `Você só pode ${verb} a sua própria loja` }, { status: 403 })
}
