'use client'

// "Comprovante" da OS no estilo da planilha da loja: compacto para caber numa tela de celular
// e ser enviado ao cliente por print.

import { buildReceiptLines, receiptSubtotal, type ReceiptServiceInput, type ReceiptProductInput } from '@/lib/orders/receipt'
import { orderEquipmentNames } from '@/lib/equipments/order-equipments'

interface OrderReceiptProps {
  order: {
    orderNumber: string
    description: string | null
    status: 'RECEIVED' | 'IN_PROGRESS' | 'PAUSED' | 'FINISHED' | 'PAID'
    totalAmount: number | string
    isVipOrder?: boolean
    createdAt: string
    client: { name: string; phone: string }
    store?: { name: string } | null
    services: (ReceiptServiceInput & { equipments?: { equipment: { id: string; name: string } }[] })[]
    products?: ReceiptProductInput[]
  }
}

const STATUS_LABEL: Record<OrderReceiptProps['order']['status'], string> = {
  RECEIVED: 'Recebido',
  IN_PROGRESS: 'Em andamento',
  PAUSED: 'Pausado',
  FINISHED: 'Finalizado',
  PAID: 'Pago',
}

const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const shortDate = (date: string) =>
  new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

const BAR = 'bg-gradient-to-b from-orange-500 to-orange-600 text-white font-bold uppercase tracking-wide'

export default function OrderReceipt({ order }: OrderReceiptProps) {
  const lines = buildReceiptLines(order.services, order.products ?? [])
  const subtotal = receiptSubtotal(lines)
  const total = Number(order.totalAmount)
  const equipments = orderEquipmentNames(order.services)

  return (
    <div className="overflow-hidden rounded-md border border-orange-600 bg-white text-[13px] leading-snug text-gray-900">
      {/* Título */}
      <div className={`${BAR} px-3 py-2 text-center`}>
        <p className="text-sm">Ordem de Serviço Nº {order.orderNumber}</p>
        {order.store?.name && (
          <p className="text-[11px] font-medium normal-case tracking-normal text-orange-50">{order.store.name}</p>
        )}
      </div>

      {/* Cabeçalho: cliente, contato, equipamento, data */}
      <div className="grid grid-cols-[1fr_auto] divide-x divide-orange-200 border-b border-orange-200">
        <p className="min-w-0 px-2 py-1.5">
          <span className="font-semibold text-blue-900">Cliente: </span>
          <span className="font-bold uppercase text-blue-900">{order.client.name}</span>
        </p>
        <p className="whitespace-nowrap px-2 py-1.5 text-gray-700">{order.client.phone}</p>
      </div>
      <div className="grid grid-cols-[1fr_auto] divide-x divide-orange-200 border-b border-orange-200">
        <p className="min-w-0 px-2 py-1.5 text-gray-700">
          Equipamento: <span className="text-gray-900">{equipments.length ? equipments.join(', ') : '—'}</span>
        </p>
        <p className="whitespace-nowrap px-2 py-1.5 text-gray-700">Data: {shortDate(order.createdAt)}</p>
      </div>
      <div className="flex items-center justify-between gap-2 border-b border-orange-200 px-2 py-1.5 text-gray-700">
        <span>
          Situação:{' '}
          <span className={`font-semibold ${order.status === 'PAID' ? 'text-green-700' : 'text-gray-900'}`}>
            {STATUS_LABEL[order.status]}
          </span>
        </span>
        {order.isVipOrder && <span className="font-semibold text-amber-700">Cliente VIP</span>}
      </div>
      {order.description && (
        <p className="whitespace-pre-line border-b border-orange-200 px-2 py-1.5 text-gray-700">
          Obs.: <span className="text-gray-900">{order.description}</span>
        </p>
      )}

      {/* Itens */}
      <div className={`${BAR} grid grid-cols-[1fr_6.5rem] text-xs`}>
        <p className="px-2 py-1.5 text-center">Detalhamento do serviço</p>
        <p className="px-2 py-1.5 text-center">Valor</p>
      </div>
      {lines.length === 0 ? (
        <p className="border-b border-orange-200 px-2 py-3 text-center text-gray-500">Nenhum item na OS</p>
      ) : (
        lines.map((line) => (
          <div key={line.key} className="grid grid-cols-[1fr_6.5rem] divide-x divide-orange-200 border-b border-orange-200">
            <div className="flex min-w-0 items-baseline justify-between gap-2 px-2 py-1.5">
              <span className="min-w-0 break-words uppercase text-blue-950">{line.name}</span>
              <span className="shrink-0 text-xs text-gray-600">{line.detail}</span>
            </div>
            <p className="whitespace-nowrap px-2 py-1.5 text-right text-gray-900">{brl(line.amount)}</p>
          </div>
        ))
      )}

      {order.isVipOrder && subtotal > 0 && (
        <div className="grid grid-cols-[1fr_6.5rem] divide-x divide-orange-200 border-b border-orange-200">
          <p className="px-2 py-1.5 text-right font-medium text-gray-700">DESCONTO VIP =</p>
          <p className="whitespace-nowrap px-2 py-1.5 text-right text-gray-900">-{brl(subtotal)}</p>
        </div>
      )}

      {/* Total */}
      <div className="grid grid-cols-[1fr_6.5rem]">
        <p className={`${BAR} px-2 py-2 text-center text-sm`}>Valor final</p>
        <p className="whitespace-nowrap px-2 py-2 text-right text-sm font-bold text-gray-900">{brl(total)}</p>
      </div>
    </div>
  )
}
