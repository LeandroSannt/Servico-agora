'use client'

import { Input, Textarea } from '@/components/ui'
import TagInput from './TagInput'
import EquipmentPhotos from './EquipmentPhotos'

export const EMPTY_EQUIPMENT_FORM = { name: '', brand: '', model: '', serialNumber: '', color: '', notes: '' }
export type EquipmentFormState = typeof EMPTY_EQUIPMENT_FORM

interface Props {
  clientId: string
  form: EquipmentFormState
  onFormChange: (form: EquipmentFormState) => void
  tags: string[]
  onTagsChange: (tags: string[]) => void
  /** Presente ao editar: fotos enviadas/removidas na hora. Ausente ao criar: usa `pendingPhotos`. */
  equipmentId?: string
  photos: { id: string }[]
  pendingPhotos: string[]
  onPendingPhotosChange: (dataUrls: string[]) => void
  onPhotosBusyChange?: (busy: boolean) => void
  disabled?: boolean
}

/** Apenas os campos do equipamento; quem chama cria/atualiza e envia as fotos pendentes. */
export default function EquipmentFields({
  clientId,
  form,
  onFormChange,
  tags,
  onTagsChange,
  equipmentId,
  photos,
  pendingPhotos,
  onPendingPhotosChange,
  onPhotosBusyChange,
  disabled,
}: Props) {
  const set = (k: keyof EquipmentFormState) => (ev: { target: { value: string } }) =>
    onFormChange({ ...form, [k]: ev.target.value })

  return (
    <>
      <Input label="Nome *" placeholder="Ex.: Split sala" value={form.name} onChange={set('name')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Marca" value={form.brand} onChange={set('brand')} />
        <Input label="Modelo" value={form.model} onChange={set('model')} />
        <Input label="Nº de série" value={form.serialNumber} onChange={set('serialNumber')} />
        <Input label="Cor" placeholder="Ex.: Branco" value={form.color} onChange={set('color')} />
      </div>
      <Textarea label="Observações" value={form.notes} onChange={set('notes')} />
      <TagInput value={tags} onChange={onTagsChange} disabled={disabled} />
      <EquipmentPhotos
        clientId={clientId}
        equipmentId={equipmentId}
        pending={pendingPhotos}
        onPendingChange={onPendingPhotosChange}
        onBusyChange={onPhotosBusyChange}
        photos={photos}
      />
    </>
  )
}
