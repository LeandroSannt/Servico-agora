'use client'

import { InputHTMLAttributes, forwardRef, useState, useEffect, ChangeEvent } from 'react'
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
    const [displayValue, setDisplayValue] = useState<string>(() => {
      const initialValue = (value ?? defaultValue ?? '') as string
      return mask ? applyMask(String(initialValue), mask) : String(initialValue)
    })

    // Sync display value when external value changes
    useEffect(() => {
      if (value !== undefined) {
        const stringValue = String(value)
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
        <input
          ref={ref}
          id={id}
          name={name}
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
