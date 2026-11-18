import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { isPublicTokenShape } from '@/lib/orders/public-link'

type Ctx = { params: Promise<{ token: string }> }

const notFound = () => NextResponse.json({ error: 'Logo não encontrada' }, { status: 404 })

// GET — logo da empresa dona da OS, para a página pública (URL versionada por ?v=)
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const { token } = await params
    if (!isPublicTokenShape(token)) return notFound()

    const order = await prisma.serviceOrder.findUnique({
      where: { publicToken: token },
      select: { store: { select: { company: { select: { logoData: true, logoMimeType: true } } } } },
    })
    const company = order?.store.company
    if (!company?.logoData || !company.logoMimeType) return notFound()
    return new NextResponse(Buffer.from(company.logoData, 'base64'), {
      headers: {
        'Content-Type': company.logoMimeType,
        'Cache-Control': 'private, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch (error) {
    console.error('Erro ao ler logo pública:', error)
    return NextResponse.json({ error: 'Erro ao ler logo' }, { status: 500 })
  }
}
