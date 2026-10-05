import { MAX_LOGO_BYTES } from '@/lib/company-logo'

export const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const MAX_SOURCE_BYTES = 5 * 1024 * 1024
/** Mesmo limite que o servidor aplica ao arquivo decodificado. */
export const MAX_LOGO_DATA_BYTES = MAX_LOGO_BYTES

/** Tamanho aproximado, em bytes, do arquivo decodificado de um data URL base64. */
function decodedSize(dataUrl: string): number {
  return Math.floor(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Não foi possível ler a imagem'))
    el.src = url
  })
}

interface Attempt {
  mime: 'image/webp' | 'image/png' | 'image/jpeg'
  quality?: number
  max: number
}

/**
 * Reduz a imagem e devolve um data URL que cabe em MAX_LOGO_DATA_BYTES.
 * Tenta WebP, depois PNG e, por fim, JPEG em tamanhos menores (Safari/iOS não gera WebP no canvas).
 */
export async function resizeImageToDataUrl(file: File, max = 512): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const longest = Math.max(img.naturalWidth, img.naturalHeight)

    const attempts: Attempt[] = [
      { mime: 'image/webp', quality: 0.9, max },
      { mime: 'image/png', max },
      { mime: 'image/jpeg', quality: 0.85, max },
      { mime: 'image/jpeg', quality: 0.85, max: Math.min(max, 384) },
      { mime: 'image/jpeg', quality: 0.8, max: Math.min(max, 256) },
    ]

    for (const attempt of attempts) {
      const scale = Math.min(1, attempt.max / longest)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Não foi possível processar a imagem')
      if (attempt.mime === 'image/jpeg') {
        // JPEG não tem transparência: desenha fundo branco antes
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const dataUrl = canvas.toDataURL(attempt.mime, attempt.quality)
      // O navegador cai para PNG quando não sabe gerar o formato pedido
      if (!dataUrl.startsWith(`data:${attempt.mime}`)) continue
      if (decodedSize(dataUrl) <= MAX_LOGO_DATA_BYTES) return dataUrl
    }

    throw new Error('Imagem muito grande (máx. 300 KB)')
  } finally {
    URL.revokeObjectURL(url)
  }
}
