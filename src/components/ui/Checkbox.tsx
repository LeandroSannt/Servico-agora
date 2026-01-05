'use client'

import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <div className="relative">
            <input
              ref={ref}
              id={id}
              type="checkbox"
              className={cn(
                'peer h-4 w-4 appearance-none border rounded transition-colors duration-200 cursor-pointer',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'checked:bg-blue-600 checked:border-blue-600',
                error ? 'border-red-500' : 'border-gray-300',
                className
              )}
              {...props}
            />
            <Check className="absolute top-0.5 left-0.5 h-3 w-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
          </div>
        </div>
        {label && (
          <label
            htmlFor={id}
            className="ml-2 text-sm text-gray-700 cursor-pointer select-none"
          >
            {label}
          </label>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export default Checkbox
