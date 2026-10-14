'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { normalizeTags, MAX_TAGS, MAX_TAG_LENGTH } from '@/lib/equipments/tags'

interface Props {
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}

/** Chips de características: Enter ou vírgula adiciona; × remove. */
export default function TagInput({ value, onChange, disabled }: Props) {
  const [text, setText] = useState('')
  const full = value.length >= MAX_TAGS

  const commit = (raw: string) => {
    const parts = raw.split(',')
    if (parts.every((p) => !p.trim())) {
      setText('')
      return
    }
    onChange(normalizeTags([...value, ...parts]))
    setText('')
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">Características</label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs text-blue-800"
            >
              {tag}
              <button
                type="button"
                aria-label={`Remover ${tag}`}
                disabled={disabled}
                className="hover:text-blue-950"
                onClick={() => onChange(value.filter((t) => t !== tag))}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {full ? (
        <p className="text-xs text-gray-500">Máximo de {MAX_TAGS} características.</p>
      ) : (
        <input
          type="text"
          value={text}
          maxLength={MAX_TAG_LENGTH}
          disabled={disabled}
          placeholder="Ex.: Inverter, 220V (Enter ou vírgula adiciona)"
          className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onChange={(e) => {
            const v = e.target.value
            if (v.includes(',')) commit(v)
            else setText(v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit(text)
            }
          }}
          onBlur={() => commit(text)}
        />
      )}
    </div>
  )
}
