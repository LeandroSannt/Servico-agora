import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireClientAccess } from '@/lib/equipments/client-access'
import { parsePhotoDataUrl, MAX_PHOTOS, MAX_PHOTO_DATA_URL_LENGTH } from '@/lib/equipments/photos'

type Ctx = { params: Promise<{ id: string; equipmentId: string }> }

// POST — adiciona uma foto { dataUrl } (máx. 5 por equipamento)
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { id, equipmentId } = await params
    const access = await requireClientAccess(id, 'adicionar fotos em')
    if (access.error) return access.error

    // Recusa corpos gigantes antes de lê-los (data URL de 800 KB tem ~1,1 MB)
    const declared = Number(request.headers.get('content-length') ?? 0)
    if (declared > MAX_PHOTO_DATA_URL_LENGTH + 1024) {
      return NextResponse.json({ error: 'Imagem acima de 800 KB' }, { status: 413 })
    }

    const body = await request.json().catch(() => null)
    const parsed = parsePhotoDataUrl(body?.dataUrl)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    // FOR UPDATE serializa uploads concorrentes: o limite de fotos não é ultrapassado
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM equipments WHERE id = ${equipmentId} AND client_id = ${id} FOR UPDATE`
      if (locked.length === 0) return 'not-found' as const
      const count = await tx.equipmentPhoto.count({ where: { equipmentId } })
      if (count >= MAX_PHOTOS) return 'limit' as const
      return tx.equipmentPhoto.create({
        data: { equipmentId, data: parsed.data, mimeType: parsed.mimeType, sizeBytes: parsed.sizeBytes },
        select: { id: true },
      })
    })
    if (result === 'not-found') return NextResponse.json({ error: 'Equipamento não encontrado' }, { status: 404 })
    if (result === 'limit') {
      return NextResponse.json({ error: `Máximo de ${MAX_PHOTOS} fotos por equipamento` }, { status: 400 })
    }
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Erro ao adicionar foto:', error)
    return NextResponse.json({ error: 'Erro ao adicionar foto' }, { status: 500 })
  }
}
