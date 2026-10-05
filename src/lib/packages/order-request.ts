import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { InsufficientBalanceError, InvalidPackageUsageError } from './errors'

interface ItemUse {
  serviceId?: string | null
  quantity: number
  usePackageQuantity?: number
}

/** Validação barata antes da transação; devolve a mensagem de erro (400) ou null. */
export function packageUsageInputError(items: ItemUse[]): string | null {
  for (const item of items) {
    const use = item.usePackageQuantity ?? 0
    if (use > 0 && !item.serviceId?.trim()) return 'Só serviços cadastrados podem usar pacote'
    if (use > item.quantity) return 'Quantidade do pacote maior que a do item'
  }
  return null
}

/** Mapeia erros de consumo de pacote/concorrência para respostas HTTP; null se não for um deles. */
export function packageErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof InsufficientBalanceError) {
    return NextResponse.json(
      { error: 'Saldo do pacote insuficiente', serviceId: error.serviceId, remaining: error.remaining },
      { status: 409 }
    )
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || error.code === 'P2028')) {
    return NextResponse.json({ error: 'Conflito ao salvar a OS; tente novamente' }, { status: 409 })
  }
  if (error instanceof InvalidPackageUsageError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return null
}

/** Opções das transações de OS: espera de trava conta no tempo limite. */
export const ORDER_TRANSACTION_OPTIONS = { timeout: 15000 } as const
