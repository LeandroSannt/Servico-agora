// Linha do tempo do andamento da OS (página pública do cliente).
import { Check, Pause } from 'lucide-react'
import type { ProgressStep } from '@/lib/orders/progress'

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })

const CIRCLE: Record<ProgressStep['state'], string> = {
  done: 'bg-blue-600 border-blue-600 text-white',
  current: 'bg-white border-blue-600 text-blue-600',
  paused: 'bg-amber-500 border-amber-500 text-white',
  todo: 'bg-white border-gray-300 text-gray-400',
}

export default function OrderProgress({ steps }: { steps: ProgressStep[] }) {
  return (
    <ol className="grid grid-cols-4">
      {steps.map((step, i) => {
        const reached = step.state !== 'todo'
        return (
          <li key={step.key} className="relative flex flex-col items-center text-center">
            {i > 0 && (
              <span
                aria-hidden
                className={`absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2 ${reached ? 'bg-blue-600' : 'bg-gray-200'}`}
              />
            )}
            <span
              className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${CIRCLE[step.state]}`}
            >
              {step.state === 'done' ? (
                <Check className="h-4 w-4" />
              ) : step.state === 'paused' ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                i + 1
              )}
            </span>
            <span
              className={`mt-1 text-[11px] font-medium leading-tight ${
                step.state === 'paused' ? 'text-amber-700' : reached ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
            {step.date && <span className="text-[10px] text-gray-500">{shortDate(step.date)}</span>}
          </li>
        )
      })}
    </ol>
  )
}
