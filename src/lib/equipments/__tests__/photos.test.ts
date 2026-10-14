import { describe, it, expect } from 'vitest'
import { parsePhotoDataUrl, MAX_PHOTOS, MAX_PHOTO_BYTES } from '../photos'

const b64 = (n: number) => Buffer.alloc(n, 1).toString('base64')

describe('parsePhotoDataUrl', () => {
  it('aceita jpeg válido', () => {
    const r = parsePhotoDataUrl(`data:image/jpeg;base64,${b64(1000)}`)
    expect(r).toMatchObject({ ok: true, mimeType: 'image/jpeg', sizeBytes: 1000 })
  })
  it('rejeita tipo não permitido', () => {
    expect(parsePhotoDataUrl(`data:image/gif;base64,${b64(10)}`)).toMatchObject({ ok: false })
  })
  it('rejeita acima do limite', () => {
    expect(parsePhotoDataUrl(`data:image/png;base64,${b64(MAX_PHOTO_BYTES + 1)}`)).toMatchObject({ ok: false })
  })
  it('rejeita formato inválido', () => {
    expect(parsePhotoDataUrl('lixo')).toMatchObject({ ok: false })
  })
  it('expõe o limite de 5 fotos', () => expect(MAX_PHOTOS).toBe(5))
})
