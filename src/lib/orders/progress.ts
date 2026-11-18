// Etapas do andamento da OS mostradas ao cliente na página pública. Funções puras.

export type OrderStatus = 'RECEIVED' | 'IN_PROGRESS' | 'PAUSED' | 'FINISHED' | 'PAID'

export interface ProgressStep {
  key: 'RECEIVED' | 'IN_PROGRESS' | 'FINISHED' | 'PAID'
  label: string
  state: 'done' | 'current' | 'paused' | 'todo'
  /** Data conhecida da etapa (ISO), quando o sistema guarda. */
  date: string | null
}

const ORDER: ProgressStep['key'][] = ['RECEIVED', 'IN_PROGRESS', 'FINISHED', 'PAID']

/** Pausado fica na etapa "Em andamento". */
function stepIndex(status: OrderStatus): number {
  return status === 'PAUSED' ? 1 : ORDER.indexOf(status)
}

export function buildProgressSteps(order: {
  status: OrderStatus
  createdAt: string
  finishedAt?: string | null
  paidAt?: string | null
}): ProgressStep[] {
  const current = stepIndex(order.status)
  const dates: Record<ProgressStep['key'], string | null> = {
    RECEIVED: order.createdAt,
    IN_PROGRESS: null,
    FINISHED: order.finishedAt ?? null,
    PAID: order.paidAt ?? null,
  }
  return ORDER.map((key, i) => {
    let state: ProgressStep['state'] = i < current ? 'done' : i === current ? 'current' : 'todo'
    // A última etapa alcançada (Pago) já é conclusão, não "em curso"
    if (i === current && key === 'PAID') state = 'done'
    if (i === current && order.status === 'PAUSED') state = 'paused'
    const label = key === 'IN_PROGRESS' && order.status === 'PAUSED' ? 'Pausado' : LABELS[key]
    return { key, label, state, date: i <= current ? dates[key] : null }
  })
}

const LABELS: Record<ProgressStep['key'], string> = {
  RECEIVED: 'Recebido',
  IN_PROGRESS: 'Em andamento',
  FINISHED: 'Finalizado',
  PAID: 'Pago',
}
