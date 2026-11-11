import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireOrderAccess } from '@/lib/orders/access'

type Ctx = { params: Promise<{ id: string; photoId: string }> }

const notFound = () => NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })

// GET — imagem da foto (stream binário)
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const { id, photoId } = await params
    const access = await requireOrderAccess(id)
    if (access.error) return access.error

    const photo = await prisma.orderPhoto.findFirst({
      where: { id: photoId, orderId: id },
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
    console.error('Erro ao ler foto da OS:', error)
    return NextResponse.json({ error: 'Erro ao ler foto' }, { status: 500 })
  }
}

// DELETE — remove a foto
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const { id, photoId } = await params
    const access = await requireOrderAccess(id)
    if (access.error) return access.error

    const { count } = await prisma.orderPhoto.deleteMany({ where: { id: photoId, orderId: id } })
    if (count === 0) return notFound()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao remover foto da OS:', error)
    return NextResponse.json({ error: 'Erro ao remover foto' }, { status: 500 })
  }
}
