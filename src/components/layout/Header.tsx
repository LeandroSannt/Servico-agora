'use client'

import { useSession } from 'next-auth/react'
import { Bell, Store, Menu } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Administrador Master',
  COMPANY_ADMIN: 'Admin da Empresa',
  MANAGER: 'Gerente',
  EMPLOYEE: 'Funcionário',
}

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const user = session?.user

  const roleLabel = user?.role ? ROLE_LABELS[user.role] || user.role : ''

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        {/* Left side - Menu button + Welcome */}
        <div className="flex items-center gap-3">
          {/* Hamburger menu button - mobile only */}
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
              Bem-vindo, {user?.name?.split(' ')[0] || 'Usuário'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">{roleLabel}</p>
          </div>
        </div>

        {/* Right side - Store, notifications, avatar */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Loja atual (se aplicável) - hide on very small screens */}
          {user?.store && (
            <div className="hidden sm:flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 rounded-lg">
              <Store className="w-4 h-4 text-gray-500" />
              <span className="text-xs sm:text-sm text-gray-700 truncate max-w-[100px] sm:max-w-[150px]">
                {user.store.name}
              </span>
            </div>
          )}

          {/* Notificações */}
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full relative">
            <Bell className="w-5 h-5" />
          </button>

          {/* User Avatar */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: user?.company?.primaryColor || '#2563EB' }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
