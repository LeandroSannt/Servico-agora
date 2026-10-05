import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'
import { packageUsageInputError, packageErrorResponse } from '@/lib/packages/order-request'
import { InsufficientBalanceError } from '@/lib/packages/errors'

describe('packageUsageInputError', () => {
  it('aceita itens sem uso de pacote', () => {
    expect(packageUsageInputError([{ quantity: 2 }, { serviceId: 'svc', quantity: 1, usePackageQuantity: 0 }])).toBeNull()
  })

  it('aceita uso válido de pacote', () => {
    expect(packageUsageInputError([{ serviceId: 'svc', quantity: 3, usePackageQuantity: 3 }])).toBeNull()
  })

  it('rejeita uso de pacote sem serviço cadastrado (ausente ou em branco)', () => {
    const msg = 'Só serviços cadastrados podem usar pacote'
    expect(packageUsageInputError([{ quantity: 2, usePackageQuantity: 1 }])).toBe(msg)
    expect(packageUsageInputError([{ serviceId: null, quantity: 2, usePackageQuantity: 1 }])).toBe(msg)
    expect(packageUsageInputError([{ serviceId: '  ', quantity: 2, usePackageQuantity: 1 }])).toBe(msg)
  })

  it('rejeita uso de pacote maior que a quantidade do item', () => {
    expect(packageUsageInputError([{ serviceId: 'svc', quantity: 2, usePackageQuantity: 3 }])).toBe(
      'Quantidade do pacote maior que a do item'
    )
  })
})

describe('packageErrorResponse', () => {
  it('mapeia saldo insuficiente para 409 com serviceId e remaining', async () => {
    const res = packageErrorResponse(new InsufficientBalanceError('svc', 2))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(409)
    expect(await res!.json()).toEqual({ error: 'Saldo do pacote insuficiente', serviceId: 'svc', remaining: 2 })
  })

  it.each(['P2034', 'P2028'])('mapeia erro de concorrência %s do Prisma para 409', async (code) => {
    const res = packageErrorResponse(new Prisma.PrismaClientKnownRequestError('x', { code, clientVersion: 'test' }))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(409)
    expect(await res!.json()).toEqual({ error: 'Conflito ao salvar a OS; tente novamente' })
  })

  it('não mapeia outros erros conhecidos do Prisma', () => {
    expect(packageErrorResponse(new Prisma.PrismaClientKnownRequestError('x', { code: 'P2002', clientVersion: 'test' }))).toBeNull()
  })

  it('mapeia RangeError para 400', async () => {
    const res = packageErrorResponse(new RangeError('usePackageQuantity inválido para o item'))
    expect(res!.status).toBe(400)
    expect(await res!.json()).toEqual({ error: 'usePackageQuantity inválido para o item' })
  })

  it('devolve null para erro genérico', () => {
    expect(packageErrorResponse(new Error('boom'))).toBeNull()
  })
})
