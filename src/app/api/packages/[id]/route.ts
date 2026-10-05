import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
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

    if (existing._count.sales === 0) {
      try {
        await prisma.servicePackage.delete({ where: { id } })
        return NextResponse.json({ message: 'Pacote excluído com sucesso' })
      } catch (deleteError) {
        // Uma venda pode ter sido registrada entre a contagem e o delete;
        // a FK (NoAction) barra o delete e caímos para desativar.
        const isFkViolation =
          deleteError instanceof Prisma.PrismaClientKnownRequestError && deleteError.code === 'P2003'
        if (!isFkViolation) throw deleteError
      }
    }

    await prisma.servicePackage.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ message: 'Pacote já vendido; foi desativado' })
  } catch (error) {
    console.error('Erro ao excluir pacote:', error)
    return NextResponse.json({ error: 'Erro ao excluir pacote' }, { status: 500 })
  }
}
