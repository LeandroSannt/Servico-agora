// Conteúdo da página pública da OS (sem acesso a banco: recebe os dados prontos).
import { MessageCircle, Phone, MapPin } from 'lucide-react'
import OrderReceipt from '@/components/orders/OrderReceipt'
import OrderProgress from '@/components/orders/OrderProgress'
import { whatsappLink } from '@/lib/orders/public-link'
import type { OrderStatus, ProgressStep } from '@/lib/orders/progress'
import type { ComponentProps } from 'react'

export interface PublicOrderViewProps {
  companyName: string
  storeName: string
  logoSrc: string | null
  contactPhone: string | null
  address: string
  status: OrderStatus
  pausedReason: string | null
  steps: ProgressStep[]
  receiptOrder: ComponentProps<typeof OrderReceipt>['order']
  photoUrls: string[]
}

export default function PublicOrderView({
  companyName,
  storeName,
  logoSrc,
  contactPhone,
  address,
  status,
  pausedReason,
  steps,
  receiptOrder,
  photoUrls,
}: PublicOrderViewProps) {
  const whatsapp = whatsappLink(contactPhone)

  return (
    <main className="min-h-screen bg-gray-100 px-3 py-4 text-gray-900 sm:py-8">
      <div className="mx-auto max-w-lg space-y-3">
        {/* Empresa */}
        <header className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt={companyName} className="h-12 w-12 shrink-0 rounded-md object-contain" />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-blue-600 text-lg font-bold text-white">
              {companyName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{companyName}</p>
            <p className="truncate text-sm text-gray-600">{storeName}</p>
          </div>
        </header>

        {/* Andamento */}
        <section className="rounded-lg bg-white p-3 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Andamento do serviço</h2>
          <OrderProgress steps={steps} />
          {status === 'PAUSED' && (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
              Serviço pausado{pausedReason ? `: ${pausedReason}` : '.'}
            </p>
          )}
          {status === 'FINISHED' && (
            <p className="mt-3 rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-800">
              Seu serviço está pronto.
            </p>
          )}
        </section>

        {/* Valores */}
        <OrderReceipt order={receiptOrder} hideClientPhone />

        {/* Fotos */}
        {photoUrls.length > 0 && (
          <section className="rounded-lg bg-white p-3 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Fotos do serviço</h2>
            <div className="grid grid-cols-3 gap-2">
              {photoUrls.map((src, i) => (
                <a
                  key={src}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square overflow-hidden rounded-md bg-gray-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Foto ${i + 1} do serviço`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </a>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">Toque na foto para ampliar.</p>
          </section>
        )}

        {/* Contato */}
        {(contactPhone || address) && (
          <section className="space-y-2 rounded-lg bg-white p-3 text-sm shadow-sm">
            <h2 className="font-semibold text-gray-700">Dúvidas? Fale com a loja</h2>
            {address && (
              <p className="flex items-start gap-2 text-gray-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                {address}
              </p>
            )}
            {contactPhone && (
              <div className="flex flex-wrap gap-2">
                {whatsapp && (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 font-medium text-white hover:bg-green-700"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                )}
                <a
                  href={`tel:${contactPhone.replace(/[^\d+]/g, '')}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Phone className="h-4 w-4" /> {contactPhone}
                </a>
              </div>
            )}
          </section>
        )}

        <p className="pb-2 text-center text-xs text-gray-400">Serviço Agora</p>
      </div>
    </main>
  )
}
