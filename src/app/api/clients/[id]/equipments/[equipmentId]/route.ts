import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { updateEquipmentSchema } from '@/lib/validations'
import { requireClientAccess } from '@/lib/equipments/client-access'
import { equipmentInclude, serializeEquipment } from '@/lib/equipments/serialize'

type Ctx = { params: Promise<{ id: string; equipmentId: string }> }

const notFound = () => NextResponse.json({ error: 'Equipamento não encontrado' }, { status: 404 })

// PATCH — edita campos; { isActive: true } reativa um arquivado
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { id, equipmentId } = await params
    const access = await requireClientAccess(id, 'editar equipamentos de')
    if (access.error) return access.error

    const parsed = updateEquipmentSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }
    const { tags, ...fields } = parsed.data
    // Só o equipamento deste cliente (where com clientId evita editar o de outro cliente)
    const owned = await prisma.equipment.findFirst({ where: { id: equipmentId, clientId: id }, select: { id: true } })
    if (!owned) return notFound()
    await prisma.$transaction(async (tx) => {
      if (Object.keys(fields).length > 0) await tx.equipment.update({ where: { id: equipmentId }, data: fields })
      if (tags !== undefined) {
        // Substitui o conjunto de características
        await tx.equipmentTag.deleteMany({ where: { equipmentId } })
        if (tags.length > 0) await tx.equipmentTag.createMany({ data: tags.map((label) => ({ equipmentId, label })) })
      }
    })
    // Pode ter sido apagado entre a transação e a releitura
    const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId }, include: equipmentInclude })
    if (!equipment) return notFound()
    return NextResponse.json(serializeEquipment(equipment))
  } catch (error) {
    console.error('Erro ao editar equipamento:', error)
    return NextResponse.json({ error: 'Erro ao editar equipamento' }, { status: 500 })
  }
}

// DELETE — apaga se nunca usado; se já usado em OS, arquiva (histórico preservado)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const { id, equipmentId } = await params
    const access = await requireClientAccess(id, 'remover equipamentos de')
    if (access.error) return access.error

    // FOR UPDATE serializa com a gravação de OS (FOR SHARE em lockAndValidateOrderEquipments):
    // um vínculo criado concorrentemente é visto pelo count e o equipamento é arquivado
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM equipments WHERE id = ${equipmentId} AND client_id = ${id} FOR UPDATE`
      if (locked.length === 0) return null
      const used = await tx.orderServiceEquipment.count({ where: { equipmentId } })
      if (used > 0) {
        await tx.equipment.update({ where: { id: equipmentId }, data: { isActive: false } })
        return { archived: true }
      }
      await tx.equipment.delete({ where: { id: equipmentId } })
      return { archived: false }
    })
    return result ? NextResponse.json(result) : notFound()
  } catch (error) {
    console.error('Erro ao remover equipamento:', error)
    return NextResponse.json({ error: 'Erro ao remover equipamento' }, { status: 500 })
  }
}
