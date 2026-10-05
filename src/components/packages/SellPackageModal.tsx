'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Modal, Select, Textarea, Button } from '@/components/ui'
import { usePackages, useSellPackage } from '@/hooks/api'
import { formatCurrency } from '@/lib/utils'

interface SellClient {
  id: string
  name: string
  storeId: string
}

interface Props {
  client: SellClient | null
  onClose: () => void
}

export default function SellPackageModal({ client, onClose }: Props) {
  return (
    <Modal isOpen={!!client} onClose={onClose} title={`Vender pacote — ${client?.name ?? ''}`}>
      {client && <SellPackageContent key={client.id} client={client} onClose={onClose} />}
    </Modal>
  )
}

function SellPackageContent({ client, onClose }: { client: SellClient; onClose: () => void }) {
  const [packageId, setPackageId] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = usePackages({ storeId: client.storeId, sellable: true })
  const packages = data?.data || []
  const validId = packages.some((p) => p.id === packageId) ? packageId : ''
  const selected = packages.find((p) => p.id === validId)
  const sell = useSellPackage(client.id)

  const submit = async () => {
    if (!validId) return setError('Escolha um pacote')
    setError(null)
    try {
      await sell.mutateAsync({ packageId: validId, notes: notes || undefined })
      onClose()
    } catch (e) {
      const axiosError = e as { response?: { data?: { error?: string } } }
      setError(axiosError?.response?.data?.error || 'Erro ao vender pacote')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {isError ? (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between gap-3">
          <span>Não foi possível carregar os pacotes.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      ) : !isLoading && packages.length === 0 ? (
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
            value={validId}
            onChange={(e) => setPackageId(e.target.value)}
          />
          {selected && (
            <p className="text-sm text-gray-600">
              {selected.quantity} unidades de <strong className="text-gray-900">{selected.service.name}</strong> por {formatCurrency(selected.price)}{' '}
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
        <Button variant="outline" onClick={onClose} disabled={sell.isPending}>Cancelar</Button>
        <Button onClick={submit} isLoading={sell.isPending} disabled={!validId || sell.isPending}>Registrar venda</Button>
      </div>
    </div>
  )
}
