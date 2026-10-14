'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  /** Rótulo do item no resumo, ex.: "clientes". */
  itemLabel?: string
}

/** Páginas a mostrar: primeira, última e vizinhas da atual, com null no lugar das lacunas. */
export function pageWindow(page: number, totalPages: number): (number | null)[] {
  const wanted = new Set<number>([1, totalPages, page - 1, page, page + 1])
  const sorted = Array.from(wanted)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b)
  const out: (number | null)[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null)
    out.push(p)
  })
  return out
}

export default function Pagination({ page, totalPages, total, limit, onPageChange, itemLabel = 'itens' }: PaginationProps) {
  if (total === 0) return null
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  const btn =
    'h-9 min-w-9 px-2 inline-flex items-center justify-center rounded-lg border text-sm transition-colors ' +
    'disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
      <p className="text-sm text-gray-600">
        Mostrando {from}–{to} de {total} {itemLabel}
      </p>
      {totalPages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Paginação">
          <button
            type="button"
            className={cn(btn, 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50')}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageWindow(page, totalPages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className="px-1 text-gray-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  btn,
                  p === page
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            className={cn(btn, 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50')}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  )
}
