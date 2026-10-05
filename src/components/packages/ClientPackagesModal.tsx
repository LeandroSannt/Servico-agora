'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Modal, Badge, Button } from '@/components/ui'
import { useClientPackages, useCancelClientPackage, type ClientPackage } from '@/hooks/api'
import { formatCurrency, ORDER_STATUS_LABELS } from '@/lib/utils'

interface HistoryClient {
  id: string
  name: string
}

interface Props {
  client: HistoryClient | null
  canCancel: boolean
  onClose: () => void
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

export default function ClientPackagesModal({ client, canCancel, onClose }: Props) {
  return (
    <Modal isOpen={!!client} onClose={onClose} title={`Pacotes — ${client?.name ?? ''}`} size="lg">
      {client && <ClientPackagesContent key={client.id} client={client} canCancel={canCancel} onClose={onClose} />}
    </Modal>
  )
}

function ClientPackagesContent({ client, canCancel, onClose }: { client: HistoryClient; canCancel: boolean; onClose: () => void }) {
  const { data, isLoading, isError, refetch } = useClientPackages(client.id)
  const cancel = useCancelClientPackage(client.id)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ClientPackage | null>(null)
  const [error, setError] = useState<{ id: string; message: string } | null>(null)

  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const backRef = useRef<HTMLButtonElement | null>(null)
  const returnFocusId = useRef<string | null>(null)

  const confirmId = confirm?.id ?? null

  // Foca "Voltar" quando a confirmação aparece; devolve o foco ao gatilho quando ela some.
  useEffect(() => {
    if (confirmId) {
      backRef.current?.focus()
    } else if (returnFocusId.current) {
      triggerRefs.current[returnFocusId.current]?.focus()
      returnFocusId.current = null
    }
  }, [confirmId])

  const openConfirm = (p: ClientPackage) => {
    setError(null)
    setConfirm(p)
  }

  const dismissConfirm = () => {
    returnFocusId.current = confirm?.id ?? null
    setConfirm(null)
  }

  const doCancel = async () => {
    if (!confirm) return
    const target = confirm
    setError(null)
    try {
      await cancel.mutateAsync(target.id)
      setConfirm(null)
    } catch (e) {
      const axiosError = e as { response?: { data?: { error?: string } } }
      setError({ id: target.id, message: axiosError?.response?.data?.error || 'Erro ao cancelar' })
      returnFocusId.current = target.id
      setConfirm(null)
    }
  }

  const packages = data?.packages ?? []

  return (
    <div className="space-y-3">
      {isError ? (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between gap-3">
          <span>Não foi possível carregar os pacotes.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      ) : (
        <>
          {isLoading && <p className="text-sm text-gray-500">Carregando...</p>}
          {!isLoading && packages.length === 0 && (
            <p className="text-sm text-gray-500">Este cliente ainda não comprou pacotes.</p>
          )}
        </>
      )}

      {packages.map((p) => {
        const cancelled = p.status === 'CANCELLED'
        const exhausted = !cancelled && p.remaining === 0
        const pct = p.quantity > 0 ? Math.round((p.remaining / p.quantity) * 100) : 0
        const confirming = confirm?.id === p.id
        return (
          <div key={p.id} className={`border rounded-lg p-3 ${cancelled ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`font-medium text-gray-900 ${cancelled ? 'line-through' : ''}`}>{p.name}</p>
                <p className="text-xs text-gray-500">
                  {formatDate(p.soldAt)} · {formatCurrency(p.price)} · vendido por {p.soldBy?.name ?? '—'}
                </p>
                {p.notes && <p className="text-xs text-gray-500 mt-0.5">{p.notes}</p>}
              </div>
              {cancelled ? (
                <Badge variant="default">Cancelado</Badge>
              ) : exhausted ? (
                <Badge variant="default">Esgotado</Badge>
              ) : (
                <Badge variant="success">{p.remaining} restantes</Badge>
              )}
            </div>

            {!cancelled && (
              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded" role="progressbar" aria-valuemin={0} aria-valuemax={p.quantity} aria-valuenow={p.remaining} aria-label={`${p.remaining} de ${p.quantity} restantes`}>
                  <div className="h-2 bg-blue-600 rounded" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{p.used} de {p.quantity} usados</p>
              </div>
            )}

            <div className="flex items-center justify-between mt-2">
              <button
                type="button"
                className="text-xs text-blue-600 flex items-center gap-1"
                aria-expanded={expanded === p.id}
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              >
                {expanded === p.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {p.usages.length} uso(s)
              </button>
              {canCancel && !cancelled && p.used === 0 && !confirming && (
                <Button
                  ref={(el) => { triggerRefs.current[p.id] = el }}
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  disabled={cancel.isPending}
                  onClick={() => openConfirm(p)}
                >
                  Cancelar venda
                </Button>
              )}
            </div>

            {error?.id === p.id && (
              <div role="alert" className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error.message}
              </div>
            )}

            {confirming && (
              <div
                className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg space-y-3"
                role="alertdialog"
                aria-labelledby={`cancel-title-${p.id}`}
                aria-describedby={`cancel-desc-${p.id}`}
              >
                <p id={`cancel-title-${p.id}`} className="text-sm font-medium text-red-900">Cancelar venda</p>
                <p id={`cancel-desc-${p.id}`} className="text-sm text-red-800">
                  Cancelar a venda de <strong>{p.name}</strong>? O saldo deixa de valer. Esta ação não registra devolução de dinheiro.
                </p>
                <div className="flex justify-end gap-2">
                  <Button ref={backRef} variant="outline" size="sm" onClick={dismissConfirm} disabled={cancel.isPending}>Voltar</Button>
                  <Button variant="danger" size="sm" onClick={doCancel} isLoading={cancel.isPending}>Confirmar cancelamento</Button>
                </div>
              </div>
            )}

            {expanded === p.id && p.usages.length > 0 && (
              <ul className="mt-2 text-xs text-gray-600 space-y-1 border-t pt-2">
                {p.usages.map((u, i) => (
                  <li key={i} className="flex justify-between">
                    <span>
                      {formatDate(u.createdAt)} · {u.quantity} un ·{' '}
                      <Link href={`/orders?search=${encodeURIComponent(u.order.orderNumber)}`} className="text-blue-600 underline">
                        OS {u.order.orderNumber}
                      </Link>
                    </span>
                    <span>{ORDER_STATUS_LABELS[u.order.status] ?? u.order.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      <div className="flex justify-end border-t pt-4">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  )
}
