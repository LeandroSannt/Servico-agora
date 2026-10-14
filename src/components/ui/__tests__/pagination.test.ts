import { describe, it, expect } from 'vitest'
import { pageWindow } from '../Pagination'

describe('pageWindow', () => {
  it('mostra tudo quando poucas páginas', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
  })
  it('abre lacuna depois da primeira e antes da última', () => {
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10])
  })
  it('não cria lacuna quando vizinhas encostam nas pontas', () => {
    expect(pageWindow(2, 10)).toEqual([1, 2, 3, null, 10])
  })
  it('uma página só', () => {
    expect(pageWindow(1, 1)).toEqual([1])
  })
})
