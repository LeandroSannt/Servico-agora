'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Modal, Badge, Button } from '@/components/ui'
import { useClientPackages, useCancelClientPackage, type ClientPackage } from '@/hooks/api'
import { formatCurrency, ORDER_STATUS_LABELS } from '@/lib/utils'

interface Props {
  client: { id: string; name: string } | null
  canCancel: boolean
  onClose: () => void
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

export default function ClientPackagesModal({ client, canCancel, onClose }: Props) {
  const { data, isLoading } = useClientPackages(client?.id)
  const cancel = useCancelClientPackage(client?.id || '')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ClientPackage | null>(null)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setExpanded(null)
    setConfirm(null)
    setError(null)
    onClose()
  }

  const doCancel = async () => {
    if (!confirm) return
    try {
      await cancel.mutateAsync(confirm.id)
      setConfirm(null)
    } catch (e) {
      const axiosError = e as { response?: { data?: { error?: string } } }
      setError(axiosError?.response?.data?.error || 'Erro ao cancelar')
      setConfirm(null)
    }
  }

  return (
    <Modal isOpen={!!client} onClose={close} title={`Pacotes — ${client?.name ?? ''}`} size="lg">
      <div className="space-y-3">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        {isLoading && <p className="text-sm text-gray-500">Carregando...</p>}
        {!isLoading && (data?.packages.length ?? 0) === 0 && (
          <p className="text-sm text-gray-500">Este cliente ainda não comprou pacotes.</p>
        )}

        {data?.packages.map((p) => {
          const cancelled = p.status === 'CANCELLED'
          const pct = p.quantity > 0 ? Math.round((p.remaining / p.quantity) * 100) : 0
          return (
            <div key={p.id} className={`border rounded-lg p-3 ${cancelled ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`font-medium ${cancelled ? 'line-through' : ''}`}>{p.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(p.soldAt)} · {formatCurrency(p.price)} · vendido por {p.soldBy?.name ?? '—'}
                  </p>
                  {p.notes && <p className="text-xs text-gray-500 mt-0.5">{p.notes}</p>}
                </div>
                {cancelled ? <Badge variant="default">Cancelado</Badge> : <Badge variant="success">{p.remaining} restantes</Badge>}
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
                {canCancel && !cancelled && p.used === 0 && confirm?.id !== p.id && (
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setConfirm(p)}>
                    Cancelar venda
                  </Button>
                )}
              </div>

              {confirm?.id === p.id && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg space-y-3" role="alertdialog" aria-label="Cancelar venda">
                  <p className="text-sm text-red-800">
                    Cancelar a venda de <strong>{p.name}</strong>? O saldo deixa de valer. Esta ação não registra devolução de dinheiro.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConfirm(null)} disabled={cancel.isPending}>Voltar</Button>
                    <Button variant="danger" size="sm" onClick={doCancel} isLoading={cancel.isPending}>Cancelar venda</Button>
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
          <Button variant="outline" onClick={close}>Fechar</Button>
        </div>
      </div>
    </Modal>
  )
}
