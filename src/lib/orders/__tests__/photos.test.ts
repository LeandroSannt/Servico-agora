import { describe, it, expect } from 'vitest'
import { MAX_ORDER_PHOTOS, splitByPhotoLimit } from '../photos'

describe('splitByPhotoLimit', () => {
  it('aceita tudo quando cabe', () => {
    expect(splitByPhotoLimit(['a', 'b'], 0)).toEqual({ accepted: ['a', 'b'], skipped: 0 })
  })
  it('corta o que passa do limite, mantendo a ordem', () => {
    expect(splitByPhotoLimit(['a', 'b', 'c'], MAX_ORDER_PHOTOS - 2)).toEqual({ accepted: ['a', 'b'], skipped: 1 })
  })
  it('não aceita nada no limite (ou acima dele)', () => {
    expect(splitByPhotoLimit(['a'], MAX_ORDER_PHOTOS)).toEqual({ accepted: [], skipped: 1 })
    expect(splitByPhotoLimit(['a'], MAX_ORDER_PHOTOS + 3)).toEqual({ accepted: [], skipped: 1 })
  })
  it('respeita um limite customizado', () => {
    expect(splitByPhotoLimit([1, 2, 3], 1, 3)).toEqual({ accepted: [1, 2], skipped: 1 })
  })
  it('expõe o limite de 10 fotos por OS', () => expect(MAX_ORDER_PHOTOS).toBe(10))
})
