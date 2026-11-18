import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { isPublicTokenShape } from '@/lib/orders/public-link'

type Ctx = { params: Promise<{ token: string; photoId: string }> }

const notFound = () => NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })

// GET — foto do serviço pela página pública da OS (sem login; o token do link é a autorização)
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const { token, photoId } = await params
    if (!isPublicTokenShape(token)) return notFound()

    const photo = await prisma.orderPhoto.findFirst({
      where: { id: photoId, order: { publicToken: token } },
      select: { data: true, mimeType: true },
    })
    if (!photo) return notFound()
    return new NextResponse(Buffer.from(photo.data, 'base64'), {
      headers: {
        'Content-Type': photo.mimeType,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch (error) {
    console.error('Erro ao ler foto pública da OS:', error)
    return NextResponse.json({ error: 'Erro ao ler foto' }, { status: 500 })
  }
}
