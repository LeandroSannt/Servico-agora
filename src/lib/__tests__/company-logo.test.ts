import { describe, it, expect } from 'vitest'
import { parseLogoDataUrl, companyLogoUrl, InvalidLogoError, MAX_LOGO_BYTES } from '@/lib/company-logo'

const b64 = (bytes: number[]) => Buffer.from(bytes).toString('base64')
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10]
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x10, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50]

describe('parseLogoDataUrl', () => {
  it('aceita PNG, JPEG e WebP', () => {
    expect(parseLogoDataUrl(`data:image/png;base64,${b64(PNG)}`).mimeType).toBe('image/png')
    expect(parseLogoDataUrl(`data:image/jpeg;base64,${b64(JPEG)}`).mimeType).toBe('image/jpeg')
    const r = parseLogoDataUrl(`data:image/webp;base64,${b64(WEBP)}`)
    expect(r.mimeType).toBe('image/webp')
    expect(r.base64).toBe(b64(WEBP))
    expect(r.bytes).toBe(WEBP.length)
  })
  it('rejeita SVG e GIF', () => {
    expect(() => parseLogoDataUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toThrow(InvalidLogoError)
    expect(() => parseLogoDataUrl(`data:image/gif;base64,${b64([0x47, 0x49, 0x46, 0x38])}`)).toThrow(InvalidLogoError)
  })
  it('rejeita tipo declarado diferente dos bytes', () => {
    expect(() => parseLogoDataUrl(`data:image/png;base64,${b64(JPEG)}`)).toThrow('Imagem inválida')
  })
  it('rejeita RIFF/WAVE declarado como image/webp', () => {
    const WAVE = [0x52, 0x49, 0x46, 0x46, 0x10, 0, 0, 0, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20]
    expect(() => parseLogoDataUrl(`data:image/webp;base64,${b64(WAVE)}`)).toThrow('Imagem inválida')
  })
  it('base64 sem padding nunca devolve bytes que não batem com o tipo declarado', () => {
    // 'iVBORw0KGgo' (11 chars, sem '=') decodifica para 8 bytes: a assinatura PNG
    const result = (() => {
      try {
        return parseLogoDataUrl('data:image/png;base64,iVBORw0KGgo')
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidLogoError)
        return null
      }
    })()
    if (result) {
      // Se aceitar, o base64 devolvido é o normalizado (com padding) e corresponde ao PNG declarado
      expect(result.mimeType).toBe('image/png')
      expect(Buffer.from(result.base64, 'base64').subarray(0, 8).equals(Buffer.from(PNG.slice(0, 8)))).toBe(true)
      expect(result.base64.length % 4).toBe(0)
    }
    // Sem padding e com bytes diferentes da assinatura: sempre rejeitado
    expect(() => parseLogoDataUrl('data:image/png;base64,/9j/4AAQ')).toThrow(InvalidLogoError)
  })
  it('rejeita base64 inválido e texto que não é data URL', () => {
    expect(() => parseLogoDataUrl('data:image/png;base64,@@@@')).toThrow(InvalidLogoError)
    expect(() => parseLogoDataUrl('https://exemplo.com/logo.png')).toThrow(InvalidLogoError)
  })
  it('rejeita acima do limite', () => {
    const big = new Array(MAX_LOGO_BYTES + 1).fill(0)
    PNG.forEach((v, i) => (big[i] = v))
    expect(() => parseLogoDataUrl(`data:image/png;base64,${b64(big)}`)).toThrow('Imagem muito grande')
  })
})

describe('companyLogoUrl', () => {
  const updated = new Date('2026-10-05T12:00:00Z')
  it('logo enviada vira rota versionada', () => {
    expect(companyLogoUrl({ id: 'c1', logoMimeType: 'image/webp', logoUpdatedAt: updated, logoUrl: 'https://x/y.png' }))
      .toBe(`/api/companies/c1/logo?v=${updated.getTime()}`)
  })
  it('sem logo enviada usa a URL legada', () => {
    expect(companyLogoUrl({ id: 'c1', logoMimeType: null, logoUpdatedAt: null, logoUrl: 'https://x/y.png' })).toBe('https://x/y.png')
  })
  it('sem nada devolve null', () => {
    expect(companyLogoUrl({ id: 'c1', logoMimeType: null, logoUpdatedAt: null, logoUrl: null })).toBeNull()
  })
})
