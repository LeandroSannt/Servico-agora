import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireOrderAccess } from '@/lib/orders/access'
import { generatePublicToken } from '@/lib/orders/public-token'
import { publicOrderPath } from '@/lib/orders/public-link'

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST /api/orders/[id]/share — link público da OS para o cliente.
 * Reaproveita o token existente; com { regenerate: true } troca o token e o link antigo para de abrir.
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const access = await requireOrderAccess(id)
    if (access.error) return access.error

    const body = await request.json().catch(() => ({}))
    const regenerate = body?.regenerate === true

    const current = await prisma.serviceOrder.findUnique({ where: { id }, select: { publicToken: true } })
    let token = current?.publicToken ?? null
    if (!token || regenerate) {
      token = generatePublicToken()
      await prisma.serviceOrder.update({ where: { id }, data: { publicToken: token } })
    }
    return NextResponse.json({ token, path: publicOrderPath(token) })
  } catch (error) {
    console.error('Erro ao gerar link público da OS:', error)
    return NextResponse.json({ error: 'Erro ao gerar link' }, { status: 500 })
  }
}
