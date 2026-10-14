'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchSelectOption {
  value: string
  label: string
  /** Sempre visível, mesmo com busca ativa (ex.: "+ Cadastrar novo"). */
  pinned?: boolean
}

interface SearchSelectProps {
  label?: string
  options: SearchSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  error?: string
  disabled?: boolean
  id?: string
}

/** Remove acentos e caixa para comparar na busca. */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Select com campo de busca: filtra por qualquer parte do texto, sem acento e sem diferenciar maiúsculas. */
export default function SearchSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecione',
  searchPlaceholder = 'Pesquisar…',
  emptyText = 'Nenhum resultado',
  error,
  disabled,
  id,
}: SearchSelectProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value && o.value !== '')
  const visible = useMemo(() => {
    const q = normalizeSearch(query)
    if (!q) return options.filter((o) => o.value !== '')
    return options.filter((o) => o.value !== '' && (o.pinned || normalizeSearch(o.label).includes(q)))
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  const openList = () => {
    if (disabled) return
    setQuery('')
    setActive(0)
    setOpen(true)
  }

  const choose = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, Math.max(visible.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = visible[active]
      if (opt) choose(opt.value)
    }
  }

  return (
    <div className="w-full" ref={rootRef}>
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={fieldId}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => (open ? setOpen(false) : openList())}
          className={cn(
            'w-full h-10 px-3 pr-10 border rounded-lg text-sm text-left bg-white transition-colors duration-200 truncate',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300',
            selected ? 'text-gray-900' : 'text-gray-500'
          )}
        >
          {selected ? selected.label : placeholder}
        </button>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />

        {open && (
          <div className="absolute z-30 mt-1 w-full min-w-[16rem] bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="flex items-center gap-2 px-3 border-b border-gray-200">
              <Search className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                className="w-full h-10 text-sm text-gray-900 bg-transparent placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <ul role="listbox" className="max-h-60 overflow-auto py-1">
              {visible.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500">{emptyText}</li>
              ) : (
                visible.map((opt, i) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={opt.value === value}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(opt.value)}
                    className={cn(
                      'px-3 py-2 text-sm cursor-pointer text-gray-900',
                      i === active && 'bg-gray-100',
                      opt.value === value && 'font-medium text-blue-700',
                      opt.pinned && 'text-blue-600'
                    )}
                  >
                    {opt.label}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}
