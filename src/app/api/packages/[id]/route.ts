import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { servicePackageUpdateSchema } from '@/lib/validations'
import { requireAuth, requireRoles } from '@/lib/auth-utils'
import { denyIfNoStoreAccess } from '@/lib/packages/store-access'
import { packageInclude, withDerived } from '@/lib/packages/package-serializer'

type Ctx = { params: Promise<{ id: string }> }

async function loadPackage(id: string) {
  return prisma.servicePackage.findUnique({ where: { id }, include: { ...packageInclude, store: { select: { id: true, name: true, companyId: true } } } })
}

// GET /api/packages/[id]
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error
    const { id } = await params

    const pkg = await loadPackage(id)
    if (!pkg) return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })

    const denied = denyIfNoStoreAccess(user!, pkg.store)
    if (denied) return denied

    return NextResponse.json(withDerived(pkg))
  } catch (error) {
    console.error('Erro ao buscar pacote:', error)
    return NextResponse.json({ error: 'Erro ao buscar pacote' }, { status: 500 })
  }
}

// PUT /api/packages/[id] — loja e serviço são imutáveis
export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'])
    if (error) return error
    const { id } = await params
    const body = await request.json().catch(() => null)

    const existing = await loadPackage(id)
    if (!existing) return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })

    const denied = denyIfNoStoreAccess(user!, existing.store, 'editar pacotes de')
    if (denied) return denied

    const raw: Record<string, unknown> = body && typeof body === 'object' && !Array.isArray(body) ? body : {}
    if ((raw.storeId && raw.storeId !== existing.storeId) || (raw.serviceId && raw.serviceId !== existing.serviceId)) {
      return NextResponse.json({ error: 'Loja e serviço do pacote não podem ser alterados' }, { status: 400 })
    }

    const data = servicePackageUpdateSchema.parse(body)
    const updated = await prisma.servicePackage.update({
      where: { id },
      data: { ...data, description: data.description === undefined ? undefined : data.description.trim() || null },
      include: packageInclude,
    })

    return NextResponse.json(withDerived(updated))
  } catch (error) {
    console.error('Erro ao atualizar pacote:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Dados inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar pacote' }, { status: 500 })
  }
}

// DELETE /api/packages/[id] — apaga se nunca vendido; senão desativa
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'])
    if (error) return error
    const { id } = await params

    const existing = await loadPackage(id)
    if (!existing) return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })

    const denied = denyIfNoStoreAccess(user!, existing.store, 'excluir pacotes de')
    if (denied) return denied

    // A FK das vendas é Cascade: apagar um pacote vendido apagaria as vendas. Trava a linha
    // do pacote (FOR UPDATE conflita com o FOR KEY SHARE de quem insere uma venda), conta as
    // vendas já confirmadas e só então apaga; se houver venda, desativa.
    const outcome = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM service_packages WHERE id = ${id} FOR UPDATE`
      if (locked.length === 0) return 'missing' as const
      const { count } = await tx.servicePackage.deleteMany({ where: { id, sales: { none: {} } } })
      if (count > 0) return 'deleted' as const
      await tx.servicePackage.update({ where: { id }, data: { isActive: false } })
      return 'deactivated' as const
    })

    if (outcome === 'missing') return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })
    if (outcome === 'deleted') return NextResponse.json({ message: 'Pacote excluído com sucesso' })
    return NextResponse.json({ message: 'Pacote já vendido; foi desativado' })
  } catch (error) {
    console.error('Erro ao excluir pacote:', error)
    return NextResponse.json({ error: 'Erro ao excluir pacote' }, { status: 500 })
  }
}
