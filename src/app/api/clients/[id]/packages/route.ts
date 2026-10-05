import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sellPackageSchema } from '@/lib/validations'
import { requireAuth, requireRoles } from '@/lib/auth-utils'
import { denyIfNoStoreAccess } from '@/lib/packages/store-access'
import { listClientPackages, loadClientPackage, serializeClientPackage } from '@/lib/packages/client-packages'

type Ctx = { params: Promise<{ id: string }> }

async function loadClientWithStore(id: string) {
  return prisma.client.findUnique({ where: { id }, include: { store: { select: { id: true, companyId: true } } } })
}

// GET /api/clients/[id]/packages — saldo por serviço + histórico
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error
    const { id } = await params

    const client = await loadClientWithStore(id)
    if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    const denied = denyIfNoStoreAccess(user!, client.store)
    if (denied) return denied

    return NextResponse.json(await listClientPackages(id))
  } catch (error) {
    console.error('Erro ao listar pacotes do cliente:', error)
    return NextResponse.json({ error: 'Erro ao listar pacotes do cliente' }, { status: 500 })
  }
}

// POST /api/clients/[id]/packages — vende um pacote (registrado como pago)
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'])
    if (error) return error
    const { id } = await params
    const body = await request.json().catch(() => null)
    const data = sellPackageSchema.parse(body)

    const client = await loadClientWithStore(id)
    if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    const denied = denyIfNoStoreAccess(user!, client.store, 'vender pacotes em')
    if (denied) return denied

    const pkg = await prisma.servicePackage.findUnique({
      where: { id: data.packageId },
      include: { service: { select: { isActive: true } } },
    })
    if (!pkg) return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })
    if (!pkg.isActive) return NextResponse.json({ error: 'Pacote inativo' }, { status: 400 })
    if (!pkg.service.isActive) return NextResponse.json({ error: 'Serviço do pacote está inativo' }, { status: 400 })
    if (pkg.storeId !== client.storeId) {
      return NextResponse.json({ error: 'Pacote não pertence à loja do cliente' }, { status: 400 })
    }

    const created = await prisma.clientPackage.create({
      data: {
        clientId: client.id,
        packageId: pkg.id,
        serviceId: pkg.serviceId,
        name: pkg.name,
        quantity: pkg.quantity,
        price: pkg.price,
        notes: data.notes?.trim() || null,
        soldById: user!.id,
      },
    })

    const full = await loadClientPackage(created.id)
    return NextResponse.json(serializeClientPackage(full!), { status: 201 })
  } catch (error) {
    console.error('Erro ao vender pacote:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Dados inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao vender pacote' }, { status: 500 })
  }
}
