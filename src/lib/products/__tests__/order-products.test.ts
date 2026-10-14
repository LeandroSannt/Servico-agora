import { describe, it, expect, vi } from 'vitest'
import { resolveOrderProducts, ProductAccessError } from '../order-products'

const base = { name: 'Filtro', quantity: 1, unitPrice: 10 }

function fakeTx(found: string[] = []) {
  return {
    product: {
      findMany: vi.fn(async () => found.map((id) => ({ id }))),
      create: vi.fn(async ({ data }: { data: { name: string } }) => ({ id: `new-${data.name}` })),
    },
  }
}

describe('resolveOrderProducts', () => {
  it('mantém avulso sem vínculo', async () => {
    const tx = fakeTx()
    expect(await resolveOrderProducts(tx as never, 's1', [base])).toEqual([{ ...base, productId: null }])
    expect(tx.product.create).not.toHaveBeenCalled()
  })
  it('vincula produto da loja', async () => {
    const tx = fakeTx(['p1'])
    const r = await resolveOrderProducts(tx as never, 's1', [{ ...base, productId: 'p1' }])
    expect(r[0].productId).toBe('p1')
  })
  it('rejeita produto de outra loja', async () => {
    const tx = fakeTx([])
    await expect(resolveOrderProducts(tx as never, 's1', [{ ...base, productId: 'x' }])).rejects.toBeInstanceOf(ProductAccessError)
  })
  it('salva no catálogo quando pedido', async () => {
    const tx = fakeTx()
    const r = await resolveOrderProducts(tx as never, 's1', [{ ...base, saveToCatalog: true }])
    expect(tx.product.create).toHaveBeenCalledOnce()
    expect(r[0].productId).toBe('new-Filtro')
  })
})
