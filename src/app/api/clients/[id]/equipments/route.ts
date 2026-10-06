import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { equipmentSchema } from '@/lib/validations'
import { requireClientAccess } from '@/lib/equipments/client-access'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/clients/[id]/equipments?includeArchived=1 — ativos por padrão
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const access = await requireClientAccess(id)
    if (access.error) return access.error

    const includeArchived = request.nextUrl.searchParams.get('includeArchived') === '1'
    const equipments = await prisma.equipment.findMany({
      where: { clientId: id, ...(includeArchived ? {} : { isActive: true }) },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    })
    return NextResponse.json(equipments)
  } catch (error) {
    console.error('Erro ao listar equipamentos:', error)
    return NextResponse.json({ error: 'Erro ao listar equipamentos' }, { status: 500 })
  }
}

// POST /api/clients/[id]/equipments — cadastra equipamento
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const access = await requireClientAccess(id, 'cadastrar equipamentos em')
    if (access.error) return access.error

    const parsed = equipmentSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }
    const created = await prisma.equipment.create({ data: { ...parsed.data, clientId: id } })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Erro ao cadastrar equipamento:', error)
    return NextResponse.json({ error: 'Erro ao cadastrar equipamento' }, { status: 500 })
  }
}
