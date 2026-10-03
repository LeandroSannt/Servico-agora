'use client'

import { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  isLoading?: boolean
  isError?: boolean
  isEmpty?: boolean
  emptyMessage?: string
  children: ReactNode
}

function ChartMessage({ children }: { children: ReactNode }) {
  return <div className="h-full flex items-center justify-center text-sm text-gray-500">{children}</div>
}

export function ChartCard({
  title,
  subtitle,
  action,
  isLoading,
  isError,
  isEmpty,
  emptyMessage = 'Sem dados no período',
  children,
}: ChartCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="h-64">
        {isLoading ? (
          <div className="h-full rounded-lg bg-gray-100 animate-pulse" />
        ) : isError ? (
          <ChartMessage>Não foi possível carregar</ChartMessage>
        ) : isEmpty ? (
          <ChartMessage>{emptyMessage}</ChartMessage>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
