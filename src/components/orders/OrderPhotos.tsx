'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { ACCEPTED_LOGO_TYPES, MAX_SOURCE_BYTES, resizeImageToDataUrl } from '@/lib/image-resize'
import { MAX_PHOTO_BYTES } from '@/lib/equipments/photos'
import { MAX_ORDER_PHOTOS, splitByPhotoLimit } from '@/lib/orders/photos'
import { orderPhotoUrl, useOrderPhotos, useUploadOrderPhoto, useDeleteOrderPhoto } from '@/hooks/api'

interface Props {
  orderId: string
}

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
  (e instanceof Error ? e.message : fallback)

/** Fotos do serviço no detalhe da OS: envia/remove na hora (a OS já existe). */
export default function OrderPhotos({ orderId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [viewing, setViewing] = useState<number | null>(null)

  const { data: photos = [], isLoading, isError } = useOrderPhotos(orderId)
  const upload = useUploadOrderPhoto(orderId)
  const del = useDeleteOrderPhoto(orderId)

  const atLimit = photos.length >= MAX_ORDER_PHOTOS
  const busy = !!progress || del.isPending

  const onFiles = async (list: FileList | null) => {
    const files = Array.from(list ?? [])
    if (inputRef.current) inputRef.current.value = ''
    if (files.length === 0) return

    const { accepted, skipped } = splitByPhotoLimit(files, photos.length)
    const problems: string[] = []
    if (skipped > 0) {
      problems.push(`${skipped} foto(s) não enviada(s): o limite é de ${MAX_ORDER_PHOTOS} por OS`)
    }
    setErrors(problems)
    if (accepted.length === 0) return

    // Uma por vez: cada foto aparece assim que é salva e o limite é checado no servidor
    setProgress({ done: 0, total: accepted.length })
    for (let i = 0; i < accepted.length; i++) {
      const file = accepted[i]
      const label = accepted.length > 1 ? `${file.name}: ` : ''
      try {
        if (!ACCEPTED_LOGO_TYPES.includes(file.type)) throw new Error('Use PNG, JPEG ou WebP')
        if (file.size > MAX_SOURCE_BYTES) throw new Error('Arquivo muito grande (máx. 5 MB)')
        const dataUrl = await resizeImageToDataUrl(file, 1280, MAX_PHOTO_BYTES)
        await upload.mutateAsync(dataUrl)
      } catch (e) {
        problems.push(label + errorMessage(e, 'Não foi possível adicionar a foto'))
        setErrors([...problems])
      }
      setProgress({ done: i + 1, total: accepted.length })
    }
    setProgress(null)
  }

  const remove = async (photoId: string) => {
    if (!window.confirm('Remover esta foto da OS?')) return
    setErrors([])
    try {
      await del.mutateAsync(photoId)
    } catch (e) {
      setErrors([errorMessage(e, 'Erro ao remover foto')])
    }
  }

  // A lista pode encolher (remoção) com o visualizador aberto
  useEffect(() => {
    if (viewing !== null && viewing >= photos.length) setViewing(photos.length ? photos.length - 1 : null)
  }, [viewing, photos.length])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs sm:text-sm font-medium text-gray-700">
          Fotos do serviço ({photos.length}/{MAX_ORDER_PHOTOS})
        </h4>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={atLimit || busy || isLoading}
          isLoading={!!progress}
          onClick={() => inputRef.current?.click()}
        >
          {!progress && <Camera className="h-4 w-4 mr-1" />}
          {progress
            ? progress.total > 1
              ? `Enviando ${Math.min(progress.done + 1, progress.total)}/${progress.total}`
              : 'Enviando...'
            : 'Adicionar fotos'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {errors.length > 0 && (
        <div role="alert" className="text-xs text-red-600 space-y-0.5">
          {errors.map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
        </div>
      ) : isError ? (
        <p className="text-xs text-red-600">Não foi possível carregar as fotos.</p>
      ) : photos.length === 0 ? (
        <p className="text-xs sm:text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
          Nenhuma foto. Registre o equipamento antes e depois do serviço.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {photos.map((p, i) => (
            <div key={p.id} className="relative aspect-square rounded-lg border bg-gray-50 overflow-hidden">
              <button
                type="button"
                onClick={() => setViewing(i)}
                className="block h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label={`Ver foto ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={orderPhotoUrl(orderId, p.id)}
                  alt={`Foto ${i + 1} do serviço`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
              <button
                type="button"
                aria-label={`Remover foto ${i + 1}`}
                disabled={busy}
                onClick={() => remove(p.id)}
                className="absolute top-1 right-1 bg-black/60 hover:bg-black/75 text-white rounded-full p-1 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {viewing !== null && photos[viewing] && (
        <PhotoViewer
          urls={photos.map((p) => orderPhotoUrl(orderId, p.id))}
          index={viewing}
          onIndexChange={setViewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}

interface ViewerProps {
  urls: string[]
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
}

/** Foto em tela cheia por cima do modal da OS (setas/teclado navegam; Esc fecha só o visualizador). */
function PhotoViewer({ urls, index, onIndexChange, onClose }: ViewerProps) {
  const count = urls.length
  const prev = useCallback(() => onIndexChange((index - 1 + count) % count), [index, count, onIndexChange])
  const next = useCallback(() => onIndexChange((index + 1) % count), [index, count, onIndexChange])

  useEffect(() => {
    // Captura na window: roda antes do listener de Esc do Modal e o impede de fechar a OS
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      } else if (e.key === 'ArrowLeft' && count > 1) prev()
      else if (e.key === 'ArrowRight' && count > 1) next()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose, prev, next, count])

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-2 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${index + 1} de ${count}`}
      onClick={onClose}
    >
      <div className="absolute top-2 left-3 text-sm text-white/80">
        {index + 1} / {count}
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <a
          href={urls[index]}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-2 text-white/80 hover:text-white rounded-lg"
          aria-label="Abrir em nova aba"
          title="Abrir em nova aba"
        >
          <ExternalLink className="h-5 w-5" />
        </a>
        <button type="button" onClick={onClose} className="p-2 text-white/80 hover:text-white rounded-lg" aria-label="Fechar">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urls[index]}
        alt={`Foto ${index + 1} do serviço`}
        className="max-h-full max-w-full object-contain rounded"
        onClick={(e) => e.stopPropagation()}
      />

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
            className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
            className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full"
            aria-label="Próxima foto"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
    </div>,
    document.body
  )
}
