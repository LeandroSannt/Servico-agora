import { NextResponse } from 'next/server'

export class InvalidEquipmentError extends Error {
  constructor(public readonly equipmentIds: string[]) {
    super('Equipamento inválido para este cliente')
    this.name = 'InvalidEquipmentError'
  }
}

/** 400 para equipamento de outro cliente/arquivado; null se não for esse erro. */
export function equipmentErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof InvalidEquipmentError)) return null
  return NextResponse.json({ error: error.message, equipmentIds: error.equipmentIds }, { status: 400 })
}
