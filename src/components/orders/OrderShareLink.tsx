'use client'

// Link público da OS para mandar ao cliente (andamento, valores e fotos sem login).

import { useState } from 'react'
import axios from 'axios'
import { Check, Copy, ExternalLink, Link2, MessageCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui'
import { whatsappLink } from '@/lib/orders/public-link'

interface Props {
  orderId: string
  orderNumber: string
  clientName: string
  clientPhone: string
}

export default function OrderShareLink({ orderId, orderNumber, clientName, clientPhone }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLink = async (regenerate = false) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.post<{ path?: unknown }>(`/api/orders/${orderId}/share`, { regenerate })
      // Sessão expirada vira redirect para o login (HTML 200): não é um link válido
      if (typeof data?.path !== 'string' || !data.path.startsWith('/os/')) throw new Error('resposta inesperada')
      setUrl(`${window.location.origin}${data.path}`)
      setCopied(false)
    } catch {
      setError('Não foi possível gerar o link. Tente de novo.')
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Não foi possível copiar. Selecione o link e copie manualmente.')
    }
  }

  const regenerate = () => {
    if (window.confirm('Gerar um novo link? O link enviado antes deixa de funcionar.')) fetchLink(true)
  }

  if (!url) {
    return (
      <div>
        <Button variant="outline" onClick={() => fetchLink()} isLoading={loading} className="w-full">
          <Link2 className="h-4 w-4 mr-2" />
          Compartilhar com o cliente
        </Button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  const firstName = clientName.trim().split(/\s+/)[0] ?? ''
  const message = `Olá${firstName ? `, ${firstName}` : ''}! Acompanhe sua ordem de serviço Nº ${orderNumber}: ${url}`
  const wa = whatsappLink(clientPhone)
  const waHref = `${wa ?? 'https://wa.me/'}?text=${encodeURIComponent(message)}`

  return (
    <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <p className="text-xs font-medium text-blue-900">Link para o cliente acompanhar a OS</p>
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-md border border-blue-200 bg-white px-2 py-1.5 text-xs text-gray-900"
      />
      <div className="grid grid-cols-3 gap-2">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-green-600 px-2 py-2 text-xs font-medium text-white hover:bg-green-700"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <ExternalLink className="h-4 w-4" /> Abrir
        </a>
      </div>
      <button
        type="button"
        onClick={regenerate}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50"
      >
        <RefreshCw className="h-3 w-3" /> Gerar novo link (o anterior para de funcionar)
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
