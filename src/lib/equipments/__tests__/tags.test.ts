import { describe, it, expect } from 'vitest'
import { normalizeTags, MAX_TAGS } from '../tags'

describe('normalizeTags', () => {
  it('apara, colapsa espaços e remove vazios', () => {
    expect(normalizeTags(['  Inverter ', '', '  ', 'Wi   Fi'])).toEqual(['Inverter', 'Wi Fi'])
  })
  it('deduplica sem diferenciar maiúsculas, mantendo a primeira', () => {
    expect(normalizeTags(['Inverter', 'inverter', 'INVERTER', '220V'])).toEqual(['Inverter', '220V'])
  })
  it('limita ao máximo', () => {
    const many = Array.from({ length: MAX_TAGS + 5 }, (_, i) => `t${i}`)
    expect(normalizeTags(many)).toHaveLength(MAX_TAGS)
  })
})
