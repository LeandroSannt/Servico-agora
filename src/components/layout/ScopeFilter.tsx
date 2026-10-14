'use client'

import { useSession } from 'next-auth/react'
import { Building2, Store } from 'lucide-react'
import { Select } from '@/components/ui'
import { useCompanies, useStores } from '@/hooks/api'

export interface ScopeValue {
  companyId: string
  storeId: string
}

interface Props {
  value: ScopeValue
  onChange: (value: ScopeValue) => void
}

/**
 * Filtro de empresa/loja das listagens e do dashboard.
 * SUPER_ADMIN: empresa e loja (da empresa escolhida). COMPANY_ADMIN: loja da própria empresa.
 * Demais perfis: não renderiza (já veem só o que lhes cabe).
 */
export default function ScopeFilter({ value, onChange }: Props) {
  const { data: session } = useSession()
  const role = session?.user?.role
  const isSuper = role === 'SUPER_ADMIN'
  const isCompanyAdmin = role === 'COMPANY_ADMIN'

  const { data: companiesData } = useCompanies({ limit: 100 })
  const { data: storesData } = useStores({ companyId: isSuper ? value.companyId || undefined : undefined, limit: 100 })

  if (!isSuper && !isCompanyAdmin) return null

  const companies = companiesData?.data ?? []
  const stores = storesData?.data ?? []

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {isSuper && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-500 hidden sm:block" />
          <Select
            aria-label="Filtrar por empresa"
            value={value.companyId}
            onChange={(e) => onChange({ companyId: e.target.value, storeId: '' })}
            options={[{ value: '', label: 'Todas as empresas' }, ...companies.map((c) => ({ value: c.id, label: c.name }))]}
            className="w-full sm:w-48"
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4 text-gray-500 hidden sm:block" />
        <Select
          aria-label="Filtrar por loja"
          value={value.storeId}
          onChange={(e) => onChange({ ...value, storeId: e.target.value })}
          options={[{ value: '', label: 'Todas as lojas' }, ...stores.map((s) => ({ value: s.id, label: s.name }))]}
          className="w-full sm:w-48"
        />
      </div>
    </div>
  )
}
