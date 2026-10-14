'use client'

import { useState } from 'react'
import { Modal, Button } from '@/components/ui'
import { useCreateEquipment, useUploadEquipmentPhoto, type Equipment } from '@/hooks/api'
import EquipmentFields, { EMPTY_EQUIPMENT_FORM, type EquipmentFormState } from '@/components/equipments/EquipmentFields'
import { equipmentSchema } from '@/lib/validations'

interface Props {
  open: boolean
  clientId: string
  onClose: () => void
  onCreated: (equipment: Equipment) => void
}

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback

export default function QuickEquipmentModal({ open, clientId, onClose, onCreated }: Props) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Novo equipamento" size="lg">
      {open && <Content key={clientId} clientId={clientId} onClose={onClose} onCreated={onCreated} />}
    </Modal>
  )
}

function Content({ clientId, onClose, onCreated }: Omit<Props, 'open'>) {
  const create = useCreateEquipment(clientId)
  const uploadPhoto = useUploadEquipmentPhoto(clientId)
  const [form, setForm] = useState<EquipmentFormState>(EMPTY_EQUIPMENT_FORM)
  const [tags, setTags] = useState<string[]>([])
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([])
  const [photosBusy, setPhotosBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Equipamento já criado, mas com fotos que falharam: o usuário confirma para seguir
  const [partial, setPartial] = useState<{ equipment: Equipment; failures: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const save = async () => {
    if (submitting) return
    const parsed = equipmentSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const created = await create.mutateAsync({ ...form, tags })
      let failures = 0
      for (const dataUrl of pendingPhotos) {
        try {
          await uploadPhoto.mutateAsync({ equipmentId: created.id, dataUrl })
        } catch {
          failures++
        }
      }
      if (failures > 0) setPartial({ equipment: created, failures })
      else onCreated(created)
    } catch (e) {
      setError(errorMessage(e, 'Erro ao salvar equipamento'))
    } finally {
      setSubmitting(false)
    }
  }

  if (partial) {
    return (
      <div className="space-y-4">
        <p role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          Equipamento criado, mas {partial.failures} foto(s) não foram enviadas. Você pode editá-lo depois em Clientes &gt;
          Equipamentos para tentar de novo.
        </p>
        <div className="flex justify-end">
          <Button type="button" onClick={() => onCreated(partial.equipment)}>
            Continuar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <EquipmentFields
        clientId={clientId}
        form={form}
        onFormChange={setForm}
        tags={tags}
        onTagsChange={setTags}
        photos={[]}
        pendingPhotos={pendingPhotos}
        onPendingPhotosChange={setPendingPhotos}
        onPhotosBusyChange={setPhotosBusy}
        disabled={submitting}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting || photosBusy}>
          Cancelar
        </Button>
        <Button type="button" onClick={save} isLoading={submitting} disabled={photosBusy}>
          Salvar
        </Button>
      </div>
    </div>
  )
}
