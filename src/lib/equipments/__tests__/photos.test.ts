import { describe, it, expect } from 'vitest'
import { parsePhotoDataUrl, MAX_PHOTOS, MAX_PHOTO_BYTES, MAX_PHOTO_DATA_URL_LENGTH } from '../photos'

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG = [0xff, 0xd8, 0xff, 0xe0]
const ascii = (t: string) => Array.from(t, (c) => c.charCodeAt(0))
const WEBP = [...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')]

/** Buffer com a assinatura no início e preenchimento até n bytes. */
const b64 = (n: number, magic: number[] = JPEG) => {
  const buf = Buffer.alloc(Math.max(n, magic.length), 1)
  Buffer.from(magic).copy(buf)
  return buf.toString('base64')
}

describe('parsePhotoDataUrl', () => {
  it('aceita jpeg válido', () => {
    const r = parsePhotoDataUrl(`data:image/jpeg;base64,${b64(1000)}`)
    expect(r).toMatchObject({ ok: true, mimeType: 'image/jpeg', sizeBytes: 1000 })
  })
  it('aceita png e webp com assinatura correta', () => {
    expect(parsePhotoDataUrl(`data:image/png;base64,${b64(100, PNG)}`)).toMatchObject({ ok: true })
    expect(parsePhotoDataUrl(`data:image/webp;base64,${b64(100, WEBP)}`)).toMatchObject({ ok: true })
  })
  it('rejeita conteúdo que não bate com o tipo declarado', () => {
    expect(parsePhotoDataUrl(`data:image/png;base64,${b64(100, JPEG)}`)).toMatchObject({ ok: false })
    expect(parsePhotoDataUrl(`data:image/jpeg;base64,${b64(100, PNG)}`)).toMatchObject({ ok: false })
    expect(parsePhotoDataUrl(`data:image/webp;base64,${b64(100, PNG)}`)).toMatchObject({ ok: false })
    expect(parsePhotoDataUrl(`data:image/png;base64,${Buffer.from('<html>').toString('base64')}`)).toMatchObject({ ok: false })
  })
  it('rejeita tipo não permitido', () => {
    expect(parsePhotoDataUrl(`data:image/gif;base64,${b64(10)}`)).toMatchObject({ ok: false })
  })
  it('rejeita acima do limite', () => {
    expect(parsePhotoDataUrl(`data:image/png;base64,${b64(MAX_PHOTO_BYTES + 1, PNG)}`)).toMatchObject({ ok: false })
  })
  it('aceita exatamente no limite', () => {
    expect(parsePhotoDataUrl(`data:image/png;base64,${b64(MAX_PHOTO_BYTES, PNG)}`)).toMatchObject({ ok: true })
  })
  it('rejeita cedo strings gigantes, antes da regex', () => {
    const huge = 'data:image/png;base64,' + 'A'.repeat(MAX_PHOTO_DATA_URL_LENGTH)
    expect(parsePhotoDataUrl(huge)).toMatchObject({ ok: false, error: 'Imagem acima de 800 KB' })
  })
  it('rejeita formato inválido', () => {
    expect(parsePhotoDataUrl('lixo')).toMatchObject({ ok: false })
  })
  it('expõe o limite de 5 fotos', () => expect(MAX_PHOTOS).toBe(5))
})
