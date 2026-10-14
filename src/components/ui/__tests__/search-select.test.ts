import { describe, it, expect } from 'vitest'
import { normalizeSearch } from '../SearchSelect'

describe('normalizeSearch', () => {
  it('ignora acentos e caixa', () => {
    expect(normalizeSearch('  Cândido LINHARES ')).toBe('candido linhares')
  })
  it('permite achar por parte do telefone', () => {
    expect(normalizeSearch('Boanerges - +55 85 99626-4457')).toContain('99626')
  })
})
