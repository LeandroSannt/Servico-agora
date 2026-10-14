import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireClientAccess } from '@/lib/equipments/client-access'

type Ctx = { params: Promise<{ id: string; equipmentId: string; photoId: string }> }

const notFound = () => NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })

// GET — imagem da foto (stream binário)
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const { id, equipmentId, photoId } = await params
    const access = await requireClientAccess(id)
    if (access.error) return access.error

    const photo = await prisma.equipmentPhoto.findFirst({
      where: { id: photoId, equipmentId, equipment: { clientId: id } },
      select: { data: true, mimeType: true },
    })
    if (!photo) return notFound()
    return new NextResponse(Buffer.from(photo.data, 'base64'), {
      headers: {
        'Content-Type': photo.mimeType, 'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Erro ao ler foto:', error)
    return NextResponse.json({ error: 'Erro ao ler foto' }, { status: 500 })
  }
}

// DELETE — remove a foto
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const { id, equipmentId, photoId } = await params
    const access = await requireClientAccess(id, 'remover fotos de')
    if (access.error) return access.error

    const { count } = await prisma.equipmentPhoto.deleteMany({
      where: { id: photoId, equipmentId, equipment: { clientId: id } },
    })
    if (count === 0) return notFound()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao remover foto:', error)
    return NextResponse.json({ error: 'Erro ao remover foto' }, { status: 500 })
  }
}
