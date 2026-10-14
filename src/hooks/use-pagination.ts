import { useEffect, useState } from 'react'

/** Página atual de uma listagem; volta para a 1 quando os filtros (resetKey) mudam. */
export function usePageState(resetKey: string) {
  const [page, setPage] = useState(1)
  useEffect(() => {
    setPage(1)
  }, [resetKey])
  return [page, setPage] as const
}

/** Se a página atual deixou de existir (ex.: apagou o último item da última página), volta para a última. */
export function useClampPage(page: number, totalPages: number | undefined, setPage: (p: number) => void) {
  useEffect(() => {
    if (totalPages && totalPages > 0 && page > totalPages) setPage(totalPages)
  }, [page, totalPages, setPage])
}
