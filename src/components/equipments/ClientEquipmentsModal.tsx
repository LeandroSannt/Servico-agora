'use client'

import { useState } from 'react'
import { Pencil, Trash2, RotateCcw, Plus } from 'lucide-react'
import { Modal, Button, Input, Textarea, Badge } from '@/components/ui'
import {
  useClientEquipments,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  useUploadEquipmentPhoto,
  equipmentPhotoUrl,
  type Equipment,
} from '@/hooks/api'
import TagInput from './TagInput'
import EquipmentPhotos from './EquipmentPhotos'
import { equipmentSchema } from '@/lib/validations'

interface Props {
  client: { id: string; name: string } | null
  onClose: () => void
}

export default function ClientEquipmentsModal({ client, onClose }: Props) {
  return (
    <Modal isOpen={!!client} onClose={onClose} title={`Equipamentos — ${client?.name ?? ''}`} size="lg">
      {client && <Content key={client.id} clientId={client.id} />}
    </Modal>
  )
}

const EMPTY = { name: '', brand: '', model: '', serialNumber: '', color: '', notes: '' }
type FormState = typeof EMPTY

const errorMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback

function Content({ clientId }: { clientId: string }) {
  const [showArchived, setShowArchived] = useState(false)
  const { data: equipments = [], isLoading, isError, refetch } = useClientEquipments(clientId, { includeArchived: showArchived })
  const create = useCreateEquipment(clientId)
  const update = useUpdateEquipment(clientId)
  const remove = useDeleteEquipment(clientId)
  const uploadPhoto = useUploadEquipmentPhoto(clientId)

  // editing: null = formulário fechado; 'new' = cadastrando; id = editando
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [tags, setTags] = useState<string[]>([])
  // Fotos escolhidas ao cadastrar (enviadas após o POST do equipamento)
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNoticeState] = useState<{ text: string; tone: 'info' | 'error' } | null>(null)
  const setNotice = (text: string | null, tone: 'info' | 'error' = 'info') =>
    setNoticeState(text ? { text, tone } : null)

  const openNew = () => {
    setForm(EMPTY)
    setTags([])
    setPendingPhotos([])
    setEditing('new')
    setError(null)
  }
  const openEdit = (e: Equipment) => {
    setForm({
      name: e.name,
      brand: e.brand ?? '',
      model: e.model ?? '',
      serialNumber: e.serialNumber ?? '',
      color: e.color ?? '',
      notes: e.notes ?? '',
    })
    setTags(e.tags)
    setPendingPhotos([])
    setEditing(e.id)
    setError(null)
  }

  const save = async () => {
    const parsed = equipmentSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }
    try {
      let photoFailures = 0
      if (editing === 'new') {
        const created = await create.mutateAsync({ ...form, tags })
        for (const dataUrl of pendingPhotos) {
          try {
            await uploadPhoto.mutateAsync({ equipmentId: created.id, dataUrl })
          } catch {
            photoFailures++
          }
        }
      } else if (editing) await update.mutateAsync({ id: editing, data: { ...form, tags } })
      setEditing(null)
      setPendingPhotos([])
      if (photoFailures > 0) {
        setNotice(`Equipamento salvo, mas ${photoFailures} foto(s) não foram enviadas. Edite o equipamento para tentar de novo.`, 'error')
      } else setNotice(null)
    } catch (e) {
      setError(errorMessage(e, 'Erro ao salvar equipamento'))
    }
  }

  const onRemove = async (e: Equipment) => {
    if (!window.confirm(`Remover "${e.name}"?`)) return
    try {
      const { archived } = await remove.mutateAsync(e.id)
      setNotice(
        archived
          ? `"${e.name}" já foi usado em OS e foi arquivado: não aparece em novas OS, mas continua no histórico.`
          : `"${e.name}" removido.`
      )
    } catch (err) {
      setNotice(errorMessage(err, 'Erro ao remover equipamento'), 'error')
    }
  }

  const reactivate = async (e: Equipment) => {
    try {
      await update.mutateAsync({ id: e.id, data: { isActive: true } })
      setNotice(`"${e.name}" reativado.`)
    } catch (err) {
      setNotice(errorMessage(err, 'Erro ao reativar equipamento'), 'error')
    }
  }

  const set = (k: keyof FormState) => (ev: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: ev.target.value }))
  const saving = create.isPending || update.isPending || uploadPhoto.isPending
  const busy = remove.isPending || update.isPending

  return (
    <div className="space-y-4">
      {notice && (
        <div
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={
            notice.tone === 'error'
              ? 'p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700'
              : 'p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-800'
          }
        >
          {notice.text}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Mostrar arquivados
        </label>
        {editing === null && (
          <Button type="button" size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />
            Novo equipamento
          </Button>
        )}
      </div>

      {editing !== null && (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Input label="Nome *" placeholder="Ex.: Split sala" value={form.name} onChange={set('name')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Marca" value={form.brand} onChange={set('brand')} />
            <Input label="Modelo" value={form.model} onChange={set('model')} />
            <Input label="Nº de série" value={form.serialNumber} onChange={set('serialNumber')} />
            <Input label="Cor" placeholder="Ex.: Branco" value={form.color} onChange={set('color')} />
          </div>
          <Textarea label="Observações" value={form.notes} onChange={set('notes')} />
          <TagInput value={tags} onChange={setTags} disabled={saving} />
          <EquipmentPhotos
            clientId={clientId}
            equipmentId={editing !== 'new' ? editing : undefined}
            pending={pendingPhotos}
            onPendingChange={setPendingPhotos}
            photos={equipments.find((x) => x.id === editing)?.photos ?? []}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={save} isLoading={saving}>
              Salvar
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-600">Carregando…</p>
      ) : isError ? (
        <p className="text-sm text-red-600">
          Erro ao carregar equipamentos.{' '}
          <button type="button" className="underline" onClick={() => refetch()}>
            Tentar novamente
          </button>
        </p>
      ) : equipments.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum equipamento cadastrado.</p>
      ) : (
        <ul className="divide-y border rounded-lg bg-white">
          {equipments.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900">
                  {e.name}
                  {!e.isActive && (
                    <Badge variant="secondary" className="ml-2">
                      Arquivado
                    </Badge>
                  )}
                </p>
                <p className="text-sm text-gray-600 truncate">
                  {[e.brand, e.model, e.color].filter(Boolean).join(' · ') || '—'}
                  {e.serialNumber ? ` · Série ${e.serialNumber}` : ''}
                </p>
                {e.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {e.tags.map((t) => (
                      <span key={t} className="rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs text-blue-800">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {e.photos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {e.photos.map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={p.id}
                        src={equipmentPhotoUrl(clientId, e.id, p.id)}
                        alt={`Foto de ${e.name}`}
                        className="h-10 w-10 rounded border object-cover"
                      />
                    ))}
                  </div>
                )}
                {e.notes && <p className="text-xs text-gray-500 mt-0.5">{e.notes}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                {e.isActive ? (
                  <>
                    <Button type="button" variant="ghost" size="icon" title="Editar" aria-label={`Editar ${e.name}`} onClick={() => openEdit(e)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" title="Remover" aria-label={`Remover ${e.name}`} disabled={busy || e.id === editing} onClick={() => onRemove(e)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="ghost" size="icon" title="Reativar" aria-label={`Reativar ${e.name}`} disabled={busy} onClick={() => reactivate(e)}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
