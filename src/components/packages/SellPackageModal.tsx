'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Modal, Select, Textarea, Button } from '@/components/ui'
import { usePackages, useSellPackage } from '@/hooks/api'
import { formatCurrency } from '@/lib/utils'

interface Props {
  client: { id: string; name: string; storeId: string } | null
  onClose: () => void
}

export default function SellPackageModal({ client, onClose }: Props) {
  const [packageId, setPackageId] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading } = usePackages({ storeId: client?.storeId, sellable: true, enabled: !!client })
  const packages = data?.data || []
  const selected = packages.find((p) => p.id === packageId)
  const sell = useSellPackage(client?.id || '')

  const close = () => {
    setPackageId('')
    setNotes('')
    setError(null)
    onClose()
  }

  const submit = async () => {
    if (!packageId) return setError('Escolha um pacote')
    try {
      await sell.mutateAsync({ packageId, notes: notes || undefined })
      close()
    } catch (e) {
      const axiosError = e as { response?: { data?: { error?: string } } }
      setError(axiosError?.response?.data?.error || 'Erro ao vender pacote')
    }
  }

  return (
    <Modal isOpen={!!client} onClose={close} title={`Vender pacote — ${client?.name ?? ''}`}>
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        {!isLoading && packages.length === 0 ? (
          <p className="text-sm text-gray-600">
            Nenhum pacote disponível para venda nesta loja.{' '}
            <Link href="/packages" className="text-blue-600 underline">Cadastrar pacotes</Link>
          </p>
        ) : (
          <>
            <Select
              id="sell-package"
              label="Pacote"
              placeholder="Selecione o pacote"
              options={packages.map((p) => ({ value: p.id, label: `${p.name} — ${formatCurrency(p.price)}` }))}
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
            />
            {selected && (
              <p className="text-sm text-gray-600">
                {selected.quantity} unidades de <strong>{selected.service.name}</strong> por {formatCurrency(selected.price)}{' '}
                ({formatCurrency(selected.unitPrice)}/un)
              </p>
            )}
            <Textarea
              id="sell-notes"
              label="Observação"
              placeholder="Ex.: pago em dinheiro"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t pt-4">
          <Button variant="outline" onClick={close} disabled={sell.isPending}>Cancelar</Button>
          <Button onClick={submit} isLoading={sell.isPending} disabled={!packageId || sell.isPending}>Registrar venda</Button>
        </div>
      </div>
    </Modal>
  )
}
