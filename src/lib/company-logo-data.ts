import { parseLogoDataUrl, companyLogoUrl } from './company-logo'

/** Converte o campo `logo` do formulário nos campos do Prisma (undefined = não mexer). */
export function logoUpdateData(logo: string | null | undefined) {
  if (logo === undefined) return {}
  if (logo === null) return { logoData: null, logoMimeType: null, logoUpdatedAt: null, logoUrl: null }
  const parsed = parseLogoDataUrl(logo)
  return { logoData: parsed.base64, logoMimeType: parsed.mimeType, logoUpdatedAt: new Date(), logoUrl: null }
}

/** Remove os bytes e calcula a URL pública antes de devolver uma empresa ao cliente. */
export function toPublicCompany<T extends { id: string; logoMimeType: string | null; logoUpdatedAt: Date | null; logoUrl: string | null }>(
  c: T & { logoData?: unknown }
) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { logoData, ...rest } = c
  return { ...rest, logoUrl: companyLogoUrl(rest) }
}
