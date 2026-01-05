'use client'

import { ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: ModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  const sizes = {
    sm: 'sm:max-w-sm',      // 384px
    md: 'sm:max-w-md',      // 448px
    lg: 'sm:max-w-lg',      // 512px
    xl: 'sm:max-w-xl',      // 576px
    full: 'sm:max-w-2xl',   // 672px
  }

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <div
          className={cn(
            'bg-white rounded-xl shadow-xl w-full transform transition-all my-4 sm:my-8',
            // On mobile, always use more width
            'max-w-[calc(100vw-1rem)] sm:max-w-none',
            sizes[size]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || description) && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {title && (
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500 line-clamp-2">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 max-h-[calc(100vh-8rem)] sm:max-h-[70vh] lg:max-h-[600px] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(modalContent, document.body)
}
