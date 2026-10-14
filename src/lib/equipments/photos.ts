export const MAX_PHOTOS = 5
export const MAX_PHOTO_BYTES = 800 * 1024
export const ACCEPTED_PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

/** Tamanho máximo do data URL completo (base64 + prefixo) de uma foto no limite. */
export const MAX_PHOTO_DATA_URL_LENGTH = Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 100

type Parsed = { ok: true; mimeType: string; data: string; sizeBytes: number } | { ok: false; error: string }

/** Confere os bytes iniciais (assinatura) com o tipo declarado. */
function matchesMagic(mimeType: string, base64: string): boolean {
  const head = Buffer.from(base64.slice(0, 24), 'base64')
  if (mimeType === 'image/png') return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (mimeType === 'image/jpeg') return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
  if (mimeType === 'image/webp') return head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP'
  return false
}

/** Valida um data URL base64 de foto: tipo permitido e tamanho decodificado dentro do limite. */
export function parsePhotoDataUrl(dataUrl: unknown): Parsed {
  if (typeof dataUrl !== 'string') return { ok: false, error: 'Imagem inválida' }
  if (dataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) return { ok: false, error: 'Imagem acima de 800 KB' }
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
  if (!matchesMagic(mimeType, data)) return { ok: false, error: 'Conteúdo não corresponde ao tipo da imagem' }
  return { ok: true, mimeType, data, sizeBytes }
}
