import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireOrderAccess } from '@/lib/orders/access'
import { MAX_ORDER_PHOTOS } from '@/lib/orders/photos'
import { parsePhotoDataUrl, MAX_PHOTO_DATA_URL_LENGTH } from '@/lib/equipments/photos'

type Ctx = { params: Promise<{ id: string }> }

// GET — fotos do serviço da OS (só ids; a imagem vem do GET de cada foto)
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const access = await requireOrderAccess(id)
    if (access.error) return access.error

    const photos = await prisma.orderPhoto.findMany({
      where: { orderId: id },
      select: { id: true, createdAt: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    })
    return NextResponse.json(photos)
  } catch (error) {
    console.error('Erro ao listar fotos da OS:', error)
    return NextResponse.json({ error: 'Erro ao listar fotos' }, { status: 500 })
  }
}

// POST — adiciona uma foto { dataUrl } (máx. MAX_ORDER_PHOTOS por OS)
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const access = await requireOrderAccess(id)
    if (access.error) return access.error

    // Recusa corpos gigantes antes de lê-los (data URL de 800 KB tem ~1,1 MB)
    const declared = Number(request.headers.get('content-length') ?? 0)
    if (declared > MAX_PHOTO_DATA_URL_LENGTH + 1024) {
      return NextResponse.json({ error: 'Imagem acima de 800 KB' }, { status: 413 })
    }

    const body = await request.json().catch(() => null)
    const parsed = parsePhotoDataUrl(body?.dataUrl)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    // A trava na linha da OS serializa uploads concorrentes: o limite de fotos não é ultrapassado
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM service_orders WHERE id = ${id} FOR NO KEY UPDATE`
      if (locked.length === 0) return 'not-found' as const
      const count = await tx.orderPhoto.count({ where: { orderId: id } })
      if (count >= MAX_ORDER_PHOTOS) return 'limit' as const
      return tx.orderPhoto.create({
        data: { orderId: id, data: parsed.data, mimeType: parsed.mimeType, sizeBytes: parsed.sizeBytes },
        select: { id: true, createdAt: true },
      })
    })
    if (result === 'not-found') {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 })
    }
    if (result === 'limit') {
      return NextResponse.json({ error: `Máximo de ${MAX_ORDER_PHOTOS} fotos por OS` }, { status: 400 })
    }
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Erro ao adicionar foto na OS:', error)
    return NextResponse.json({ error: 'Erro ao adicionar foto' }, { status: 500 })
  }
}
