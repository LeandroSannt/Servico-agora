export const MAX_LOGO_BYTES = 300 * 1024

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'] as const
type LogoMime = (typeof ALLOWED)[number]

export class InvalidLogoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidLogoError'
  }
}

const INVALID = 'Imagem inválida: use PNG, JPG ou WebP'

function sniff(buf: Buffer): LogoMime | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

/** Valida um data URL de imagem e devolve o base64 puro. O tipo é conferido pelos bytes. */
export function parseLogoDataUrl(dataUrl: string): { mimeType: LogoMime; base64: string; bytes: number } {
  const match = /^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl.trim())
  if (!match) throw new InvalidLogoError(INVALID)
  const declared = match[1] as LogoMime
  if (!ALLOWED.includes(declared)) throw new InvalidLogoError(INVALID)

  const buf = Buffer.from(match[2], 'base64')
  if (buf.length === 0) throw new InvalidLogoError(INVALID)
  if (buf.length > MAX_LOGO_BYTES) throw new InvalidLogoError('Imagem muito grande (máx. 300 KB)')
  if (sniff(buf) !== declared) throw new InvalidLogoError(INVALID)

  return { mimeType: declared, base64: buf.toString('base64'), bytes: buf.length }
}

/** URL pública da logo: rota versionada se houver logo enviada; senão a URL legada. */
export function companyLogoUrl(c: {
  id: string
  logoMimeType: string | null
  logoUpdatedAt: Date | null
  logoUrl: string | null
}): string | null {
  if (c.logoMimeType) return `/api/companies/${c.id}/logo?v=${c.logoUpdatedAt ? c.logoUpdatedAt.getTime() : 0}`
  return c.logoUrl || null
}
