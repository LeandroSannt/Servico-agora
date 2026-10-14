export const MAX_PHOTOS = 5
export const MAX_PHOTO_BYTES = 800 * 1024
export const ACCEPTED_PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

type Parsed = { ok: true; mimeType: string; data: string; sizeBytes: number } | { ok: false; error: string }

/** Valida um data URL base64 de foto: tipo permitido e tamanho decodificado dentro do limite. */
export function parsePhotoDataUrl(dataUrl: unknown): Parsed {
  if (typeof dataUrl !== 'string') return { ok: false, error: 'Imagem inválida' }
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl)
  if (!m) return { ok: false, error: 'Imagem inválida' }
  const mimeType = m[1].toLowerCase()
  if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(mimeType)) {
    return { ok: false, error: 'Use PNG, JPEG ou WebP' }
  }
  const data = m[2]
  const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0
  const sizeBytes = Math.floor((data.length * 3) / 4) - padding
  if (sizeBytes > MAX_PHOTO_BYTES) return { ok: false, error: 'Imagem acima de 800 KB' }
  return { ok: true, mimeType, data, sizeBytes }
}
