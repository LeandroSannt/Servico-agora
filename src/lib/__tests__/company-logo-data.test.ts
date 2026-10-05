import { describe, it, expect } from 'vitest'
import { logoUpdateData, toPublicCompany } from '@/lib/company-logo-data'

const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]
const PNG_DATA_URL = `data:image/png;base64,${Buffer.from(PNG_BYTES).toString('base64')}`

describe('logoUpdateData', () => {
  it('undefined não mexe em nada', () => {
    expect(logoUpdateData(undefined)).toEqual({})
  })
  it('null limpa os quatro campos', () => {
    expect(logoUpdateData(null)).toEqual({ logoData: null, logoMimeType: null, logoUpdatedAt: null, logoUrl: null })
  })
  it('data URL válido grava a imagem e zera a URL legada', () => {
    const r = logoUpdateData(PNG_DATA_URL) as Record<string, unknown>
    expect(r.logoMimeType).toBe('image/png')
    expect(r.logoData).toBe(Buffer.from(PNG_BYTES).toString('base64'))
    expect(r.logoUrl).toBeNull()
    expect(r.logoUpdatedAt).toBeInstanceOf(Date)
  })
  it('data URL inválido lança', () => {
    expect(() => logoUpdateData('https://x/y.png')).toThrow('Imagem inválida')
  })
})

describe('toPublicCompany', () => {
  it('remove logoData e calcula logoUrl', () => {
    const updated = new Date('2026-10-05T12:00:00Z')
    const r = toPublicCompany({
      id: 'c1',
      name: 'Acme',
      logoData: 'AAAA',
      logoMimeType: 'image/png',
      logoUpdatedAt: updated,
      logoUrl: 'https://velha/logo.png',
    })
    expect('logoData' in r).toBe(false)
    expect(r.name).toBe('Acme')
    expect(r.logoUrl).toBe(`/api/companies/c1/logo?v=${updated.getTime()}`)
  })
  it('mantém a URL legada quando não há logo enviada', () => {
    const r = toPublicCompany({ id: 'c1', logoMimeType: null, logoUpdatedAt: null, logoUrl: 'https://velha/logo.png' })
    expect(r.logoUrl).toBe('https://velha/logo.png')
  })
})
