import { describe, it, expect } from 'vitest'
import { isPublicTokenShape, publicOrderPath, whatsappLink } from '../public-link'
import { generatePublicToken } from '../public-token'

describe('link público da OS', () => {
  it('gera tokens base64url de 24 caracteres e diferentes entre si', () => {
    const a = generatePublicToken()
    const b = generatePublicToken()
    expect(a).toMatch(/^[A-Za-z0-9_-]{24}$/)
    expect(a).not.toBe(b)
    expect(isPublicTokenShape(a)).toBe(true)
  })

  it('recusa valores que não parecem token', () => {
    expect(isPublicTokenShape('abc')).toBe(false)
    expect(isPublicTokenShape('../../etc/passwd-xxxxxxxxxxxx')).toBe(false)
    expect(isPublicTokenShape('a'.repeat(65))).toBe(false)
  })

  it('monta o caminho da página pública', () => {
    expect(publicOrderPath('tok')).toBe('/os/tok')
  })

  it('monta o link do WhatsApp da loja com DDI', () => {
    expect(whatsappLink('(11) 98765-4321')).toBe('https://wa.me/5511987654321')
    expect(whatsappLink('+55 11 98765-4321')).toBe('https://wa.me/5511987654321')
    expect(whatsappLink('1234')).toBeNull()
    expect(whatsappLink(null)).toBeNull()
  })
})
