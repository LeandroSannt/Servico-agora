import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireRoles } from '@/lib/auth-utils'
import { denyIfNoStoreAccess } from '@/lib/packages/store-access'
import { loadClientPackage, serializeClientPackage } from '@/lib/packages/client-packages'

type Ctx = { params: Promise<{ id: string; clientPackageId: string }> }

class CancelRejected extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

// DELETE /api/clients/[id]/packages/[clientPackageId] — cancela venda sem consumo
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'])
    if (error) return error
    const { id, clientPackageId } = await params

    const client = await prisma.client.findUnique({ where: { id }, include: { store: { select: { id: true, companyId: true } } } })
    if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    const denied = denyIfNoStoreAccess(user!, client.store, 'cancelar vendas em')
    if (denied) return denied

    // Trava a venda antes de checar consumo: o salvamento de OS trava a mesma linha
    // antes de gravar PackageUsage, então check + update ficam atômicos.
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string; client_id: string; status: string }[]>`
        SELECT id, client_id, status FROM client_packages WHERE id = ${clientPackageId} FOR UPDATE`
      const row = locked[0]
      if (!row || row.client_id !== id) throw new CancelRejected(404, 'Pacote do cliente não encontrado')
      if (row.status !== 'ACTIVE') throw new CancelRejected(400, 'Pacote já cancelado')
      const used = await tx.packageUsage.count({ where: { clientPackageId } })
      if (used > 0) throw new CancelRejected(400, 'Pacote já utilizado; não pode ser cancelado')
      await tx.clientPackage.update({
        where: { id: clientPackageId },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      })
    })

    const full = await loadClientPackage(clientPackageId)
    return NextResponse.json(serializeClientPackage(full!))
  } catch (error) {
    if (error instanceof CancelRejected) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Erro ao cancelar pacote:', error)
    return NextResponse.json({ error: 'Erro ao cancelar pacote' }, { status: 500 })
  }
}
