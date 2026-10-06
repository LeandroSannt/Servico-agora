import { Prisma } from '@prisma/client'
import { collectEquipmentIds, invalidEquipmentIds } from './order-equipments'
import { InvalidEquipmentError } from './errors'

interface Params {
  clientId: string
  items: { equipmentIds?: string[] | null }[]
  /** Na edição: equipamentos já vinculados à OS (lidos ANTES do deleteMany dos itens). */
  alreadyLinked?: Set<string>
}

/**
 * Trava (FOR SHARE) os equipamentos pedidos e valida que são do cliente e ativos (ou já vinculados).
 * Deve rodar dentro da transação da OS, antes de criar os itens. O FOR SHARE serializa com o
 * DELETE de equipamento (FOR UPDATE): ou o DELETE espera e depois vê o vínculo (arquiva), ou a OS
 * espera e depois não acha o equipamento (400).
 */
export async function lockAndValidateOrderEquipments(
  tx: Prisma.TransactionClient,
  { clientId, items, alreadyLinked = new Set() }: Params
): Promise<void> {
  const ids = collectEquipmentIds(items)
  if (ids.length === 0) return
  const rows = await tx.$queryRaw<{ id: string; is_active: boolean }[]>`
    SELECT id, is_active FROM equipments
    WHERE client_id = ${clientId} AND id = ANY(${ids})
    ORDER BY id
    FOR SHARE`
  const invalid = invalidEquipmentIds(
    ids,
    rows.map((r) => ({ id: r.id, isActive: r.is_active })),
    alreadyLinked
  )
  if (invalid.length > 0) throw new InvalidEquipmentError(invalid)
}
