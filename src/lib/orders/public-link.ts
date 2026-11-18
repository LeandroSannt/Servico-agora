// Link público da OS para o cliente. Funções puras (podem ir para o client);
// a geração do token fica em public-token.ts (usa crypto do Node).

/** Descarta antes de ir ao banco qualquer coisa que não tenha cara de token. */
export function isPublicTokenShape(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,64}$/.test(token)
}

export function publicOrderPath(token: string): string {
  return `/os/${token}`
}

export function publicOrderPhotoPath(token: string, photoId: string): string {
  return `/api/public/os/${token}/photos/${photoId}`
}

export function publicOrderLogoPath(token: string, version: number): string {
  return `/api/public/os/${token}/logo?v=${version}`
}

/** Link do WhatsApp da loja: só dígitos, com DDI 55 quando faltar; null se não parecer telefone. */
export function whatsappLink(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (digits.length < 10) return null
  return `https://wa.me/${digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`}`
}
