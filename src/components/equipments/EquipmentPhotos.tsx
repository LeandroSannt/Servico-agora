'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { ACCEPTED_LOGO_TYPES, MAX_SOURCE_BYTES, resizeImageToDataUrl } from '@/lib/image-resize'
import { MAX_PHOTOS, MAX_PHOTO_BYTES } from '@/lib/equipments/photos'
import { equipmentPhotoUrl, useUploadEquipmentPhoto, useDeleteEquipmentPhoto } from '@/hooks/api'

interface Props {
  clientId: string
  /** Presente ao editar: envia/remove na hora. Ausente ao criar: usa `pending`. */
  equipmentId?: string
  /** Fotos ainda não enviadas (data URLs já redimensionados); usadas só sem equipmentId. */
  pending: string[]
  onPendingChange: (dataUrls: string[]) => void
  photos: { id: string }[]
  /** Avisa quando há foto sendo processada, enviada ou removida (para travar Salvar/Cancelar). */
  onBusyChange?: (busy: boolean) => void
}

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
  (e instanceof Error ? e.message : fallback)

export default function EquipmentPhotos({ clientId, equipmentId, pending, onPendingChange, photos, onBusyChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const upload = useUploadEquipmentPhoto(clientId)
  const del = useDeleteEquipmentPhoto(clientId)

  const total = equipmentId ? photos.length : pending.length
  const atLimit = total >= MAX_PHOTOS
  const busy = processing || upload.isPending || del.isPending

  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])
  // Ao fechar o formulário com operação em curso, libera o travamento
  useEffect(() => () => onBusyChange?.(false), [onBusyChange])

  const onFile = async (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    setError(null)
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setError('Use PNG, JPEG ou WebP')
      return
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError('Arquivo muito grande (máx. 5 MB)')
      return
    }
    setProcessing(true)
    try {
      const dataUrl = await resizeImageToDataUrl(file, 1280, MAX_PHOTO_BYTES)
      if (equipmentId) await upload.mutateAsync({ equipmentId, dataUrl })
      else onPendingChange([...pending, dataUrl])
    } catch (e) {
      setError(errorMessage(e, 'Não foi possível adicionar a foto'))
    } finally {
      setProcessing(false)
    }
  }

  const removeSaved = async (photoId: string) => {
    if (!equipmentId) return
    setError(null)
    try {
      await del.mutateAsync({ equipmentId, photoId })
    } catch (e) {
      setError(errorMessage(e, 'Erro ao remover foto'))
    }
  }

  const thumbs: { key: string; src: string; onRemove: () => void }[] = equipmentId
    ? photos.map((p) => ({
        key: p.id,
        src: equipmentPhotoUrl(clientId, equipmentId, p.id),
        onRemove: () => removeSaved(p.id),
      }))
    : pending.map((src, i) => ({
        key: `p${i}`,
        src,
        onRemove: () => onPendingChange(pending.filter((_, j) => j !== i)),
      }))

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700">
          Fotos ({total}/{MAX_PHOTOS})
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={atLimit || busy}
          isLoading={processing || upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4 mr-1" />
          Adicionar foto
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      {thumbs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {thumbs.map((t) => (
            <div key={t.key} className="relative h-16 w-16 rounded-lg border bg-white overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.src} alt="Foto do equipamento" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Remover foto"
                disabled={busy}
                onClick={t.onRemove}
                className="absolute top-0 right-0 bg-black/60 text-white rounded-bl p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
