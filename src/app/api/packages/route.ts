import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { servicePackageSchema } from '@/lib/validations'
import { requireAuth, requireRoles } from '@/lib/auth-utils'
import { denyIfNoStoreAccess } from '@/lib/packages/store-access'
import { packageInclude, withDerived } from '@/lib/packages/package-serializer'

// GET /api/packages?storeId=&isActive=&sellable=&search=
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const storeId = searchParams.get('storeId')
    const isActive = searchParams.get('isActive')
    const sellable = searchParams.get('sellable') === 'true'

    // Mesma regra de denyIfNoStoreAccess — SUPER_ADMIN vê tudo,
    // COMPANY_ADMIN a própria empresa, demais perfis (default-deny) só a própria loja.
    const where: Record<string, unknown> = {}
    if (user!.role === 'SUPER_ADMIN') {
      // sem restrição
    } else if (user!.role === 'COMPANY_ADMIN') {
      where.store = { companyId: user!.companyId ?? '__none__' }
    } else {
      where.storeId = user!.storeId ?? '__none__'
    }

    // Filtro opcional por loja só refina (nunca amplia) a visibilidade acima
    if (storeId && (user!.role === 'SUPER_ADMIN' || user!.role === 'COMPANY_ADMIN')) {
      where.storeId = storeId
    }

    if (isActive === 'true' || isActive === 'false') where.isActive = isActive === 'true'

    if (sellable) {
      where.isActive = true
      where.service = { isActive: true }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { service: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const packages = await prisma.servicePackage.findMany({
      where,
      include: packageInclude,
      orderBy: [{ service: { name: 'asc' } }, { quantity: 'asc' }],
    })

    return NextResponse.json({ data: packages.map(withDerived) })
  } catch (error) {
    console.error('Erro ao listar pacotes:', error)
    return NextResponse.json({ error: 'Erro ao listar pacotes' }, { status: 500 })
  }
}

// POST /api/packages
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireRoles(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'])
    if (error) return error

    const body = await request.json()
    const data = servicePackageSchema.parse(body)

    const store = await prisma.store.findUnique({ where: { id: data.storeId } })
    if (!store) return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 })

    const denied = denyIfNoStoreAccess(user!, store, 'criar pacotes em')
    if (denied) return denied

    const service = await prisma.service.findUnique({ where: { id: data.serviceId } })
    if (!service || !service.isActive || service.storeId !== data.storeId) {
      return NextResponse.json({ error: 'Serviço inválido para esta loja' }, { status: 400 })
    }

    const created = await prisma.servicePackage.create({
      data: {
        storeId: data.storeId,
        serviceId: data.serviceId,
        name: data.name,
        description: data.description?.trim() || null,
        quantity: data.quantity,
        price: data.price,
        isActive: data.isActive ?? true,
      },
      include: packageInclude,
    })

    return NextResponse.json(withDerived(created), { status: 201 })
  } catch (error) {
    console.error('Erro ao criar pacote:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Dados inválidos', details: error }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao criar pacote' }, { status: 500 })
  }
}
