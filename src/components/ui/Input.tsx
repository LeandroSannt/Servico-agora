'use client'

import { InputHTMLAttributes, forwardRef, useState, useEffect, ChangeEvent, useRef, useImperativeHandle } from 'react'
import { cn, applyMask, unmaskValue, type MaskType } from '@/lib/utils'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  error?: string
  hint?: string
  mask?: MaskType
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, mask, value, defaultValue, onChange, onBlur, name, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const hiddenRef = useRef<HTMLInputElement>(null)

    // Calcular valor inicial com máscara
    const getInitialDisplayValue = () => {
      const initialValue = (value ?? defaultValue ?? '') as string
      if (!mask) return String(initialValue)
      // Para currency, se vier um número, converter para centavos primeiro
      if (mask === 'currency' && initialValue) {
        const numValue = typeof initialValue === 'number' ? initialValue : parseFloat(String(initialValue))
        if (!isNaN(numValue) && numValue > 0) {
          // Converter para centavos (multiplicar por 100) para a máscara funcionar
          const cents = Math.round(numValue * 100).toString()
          return applyMask(cents, mask)
        }
      }
      return applyMask(String(initialValue), mask)
    }

    const [displayValue, setDisplayValue] = useState<string>(getInitialDisplayValue)

    // Para máscaras, expor o hidden input (com valor real) para o react-hook-form
    // Para inputs normais, expor o input normal
    useImperativeHandle(ref, () => {
      if (mask && hiddenRef.current) {
        return hiddenRef.current
      }
      return inputRef.current as HTMLInputElement
    })

    // Sync display value when external value changes
    useEffect(() => {
      if (value !== undefined) {
        const stringValue = String(value)
        if (mask === 'currency' && value) {
          const numValue = typeof value === 'number' ? value : parseFloat(stringValue)
          if (!isNaN(numValue) && numValue > 0) {
            const cents = Math.round(numValue * 100).toString()
            setDisplayValue(applyMask(cents, mask))
            return
          }
        }
        const newDisplayValue = mask ? applyMask(stringValue, mask) : stringValue
        setDisplayValue(newDisplayValue)
      }
    }, [value, mask])

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value

      if (mask) {
        const maskedValue = applyMask(inputValue, mask)
        setDisplayValue(maskedValue)

        // Get the raw unmasked value to send to the form
        const rawValue = unmaskValue(maskedValue, mask)

        // Update hidden input value
        if (hiddenRef.current) {
          hiddenRef.current.value = rawValue
        }

        // Create a new event object with the unmasked value
        // This ensures react-hook-form receives the clean value
        const nativeEvent = e.nativeEvent as InputEvent
        const newEvent = new Event('change', { bubbles: true }) as unknown as ChangeEvent<HTMLInputElement>

        Object.defineProperty(newEvent, 'target', {
          writable: true,
          value: {
            ...e.target,
            value: rawValue,
            name: name || e.target.name,
          },
        })

        Object.defineProperty(newEvent, 'currentTarget', {
          writable: true,
          value: {
            ...e.currentTarget,
            value: rawValue,
            name: name || e.target.name,
          },
        })

        Object.defineProperty(newEvent, 'nativeEvent', {
          writable: true,
          value: nativeEvent,
        })

        onChange?.(newEvent)
      } else {
        setDisplayValue(inputValue)
        onChange?.(e)
      }
    }

    // Calcular valor raw atual para o hidden input
    const rawValue = mask ? unmaskValue(displayValue, mask) : ''

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        {/* Hidden input para armazenar o valor real (sem máscara) */}
        {mask && (
          <input
            ref={hiddenRef}
            type="hidden"
            name={name}
            defaultValue={rawValue}
          />
        )}
        <input
          ref={inputRef}
          id={id}
          name={mask ? undefined : name}
          value={mask ? displayValue : value}
          defaultValue={!mask ? defaultValue : undefined}
          onChange={handleChange}
          onBlur={onBlur}
          className={cn(
            'w-full h-10 px-3 border rounded-lg text-sm transition-colors duration-200',
            'text-gray-900 bg-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            'placeholder:text-gray-400',
            error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300',
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-red-600">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
