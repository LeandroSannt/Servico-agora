/** Limite de fotos do serviço por OS (cada uma até MAX_PHOTO_BYTES, como as de equipamento). */
export const MAX_ORDER_PHOTOS = 10

/**
 * Divide os arquivos escolhidos entre os que cabem no limite e os que sobram.
 * Mantém a ordem da seleção.
 */
export function splitByPhotoLimit<T>(files: T[], current: number, max = MAX_ORDER_PHOTOS): { accepted: T[]; skipped: number } {
  const free = Math.max(0, max - current)
  const accepted = files.slice(0, free)
  return { accepted, skipped: files.length - accepted.length }
}
