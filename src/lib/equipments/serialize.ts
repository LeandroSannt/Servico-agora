import type { Prisma } from '@prisma/client'

// Fotos: só o id (o base64 nunca vai na listagem; a UI usa a URL do GET da foto)
export const equipmentInclude = {
  tags: { select: { label: true }, orderBy: { label: 'asc' } },
  photos: { select: { id: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.EquipmentInclude

type Row = Prisma.EquipmentGetPayload<{ include: typeof equipmentInclude }>

export function serializeEquipment({ tags, photos, ...rest }: Row) {
  return { ...rest, tags: tags.map((t) => t.label), photos: photos.map((p) => ({ id: p.id })) }
}
