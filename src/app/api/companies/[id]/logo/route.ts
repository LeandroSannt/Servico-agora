import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/companies/[id]/logo — bytes da logo enviada (URL versionada por ?v=)
export async function GET(_request: NextRequest, { params }: Ctx) {
  const { user, error } = await requireAuth()
  if (error) return error
  const { id } = await params

  // A logo só pode ser vista por SUPER_ADMIN ou por usuários da própria empresa
  if (user!.role !== 'SUPER_ADMIN' && user!.companyId !== id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const company = await prisma.company.findUnique({
    where: { id },
    select: { logoData: true, logoMimeType: true },
  })
  if (!company?.logoData || !company.logoMimeType) {
    return NextResponse.json({ error: 'Logo não encontrada' }, { status: 404 })
  }

  return new NextResponse(Buffer.from(company.logoData, 'base64'), {
    headers: {
      'Content-Type': company.logoMimeType,
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Content-Disposition': 'inline',
    },
  })
}
