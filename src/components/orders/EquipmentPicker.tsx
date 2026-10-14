'use client'

import { Wrench, Plus } from 'lucide-react'
import type { Equipment } from '@/hooks/api'

interface Props {
  /** Equipamentos do cliente (na edição inclui arquivados; só aparecem se já selecionados). */
  equipments: Equipment[]
  value: string[]
  onChange: (ids: string[]) => void
  hasClient: boolean
  loading?: boolean
  /** Ids vinculados à OS ao abrir: continuam visíveis (mesmo arquivados) depois de desmarcados. */
  initialIds?: string[]
  /** Abre o cadastro rápido de equipamento (só com cliente selecionado). */
  onCreateNew?: () => void
}

/** Checkboxes dos equipamentos do cliente para uma linha de serviço da OS. */
export default function EquipmentPicker({ equipments, value, onChange, hasClient, loading, initialIds = [], onCreateNew }: Props) {
  const selected = new Set(value)
  const initial = new Set(initialIds)
  const options = equipments.filter((e) => e.isActive || selected.has(e.id) || initial.has(e.id))

  const toggle = (id: string, checked: boolean) =>
    onChange(checked ? [...value, id] : value.filter((v) => v !== id))

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        <Wrench className="w-4 h-4 text-gray-500" />
        Equipamentos
      </p>
      {!hasClient ? (
        <p className="text-xs text-gray-500">Selecione o cliente para escolher equipamentos.</p>
      ) : loading ? (
        <p className="text-xs text-gray-500">Carregando equipamentos…</p>
      ) : options.length === 0 ? (
        <p className="text-xs text-gray-500">Nenhum equipamento cadastrado para este cliente.</p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {options.map((e) => (
            <label key={e.id} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
                checked={selected.has(e.id)}
                onChange={(ev) => toggle(e.id, ev.target.checked)}
              />
              <span>
                {e.name}
                {e.tags.length > 0 && <span className="ml-1.5 text-xs text-gray-500">{e.tags.join(' · ')}</span>}
              </span>
              {!e.isActive && <span className="text-xs text-gray-500">(arquivado)</span>}
            </label>
          ))}
        </div>
      )}
      {hasClient && !loading && onCreateNew && (
        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <Plus className="w-4 h-4" />
          Novo equipamento
        </button>
      )}
    </div>
  )
}
