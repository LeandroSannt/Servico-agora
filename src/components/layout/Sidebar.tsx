'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Building2,
  Store,
  UserCog,
  Wrench,
  Settings,
  ChevronDown,
  LogOut,
  MessageSquare,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface MenuItem {
  href?: string
  label: string
  icon: React.ReactNode
  children?: MenuItem[]
  roles?: string[]
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [openMenus, setOpenMenus] = useState<string[]>(['Administração'])

  const user = session?.user
  const userRole = user?.role || ''
  const company = user?.company

  // Fechar sidebar ao mudar de página (mobile)
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  // Fechar sidebar ao pressionar ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // Menu items com controle de acesso por role
  const menuItems: MenuItem[] = [
    {
      href: '/',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      href: '/orders',
      label: 'Ordens de Serviço',
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      href: '/clients',
      label: 'Clientes',
      icon: <Users className="w-5 h-5" />,
    },
    {
      href: '/services',
      label: 'Serviços',
      icon: <Wrench className="w-5 h-5" />,
    },
    {
      label: 'Administração',
      icon: <Settings className="w-5 h-5" />,
      roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
      children: [
        {
          href: '/admin/companies',
          label: 'Empresas',
          icon: <Building2 className="w-5 h-5" />,
          roles: ['SUPER_ADMIN'],
        },
        {
          href: '/admin/stores',
          label: 'Lojas',
          icon: <Store className="w-5 h-5" />,
          roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
        },
        {
          href: '/admin/users',
          label: 'Usuários',
          icon: <UserCog className="w-5 h-5" />,
          roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
        },
        {
          href: '/admin/whatsapp',
          label: 'WhatsApp',
          icon: <MessageSquare className="w-5 h-5" />,
          roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
        },
      ],
    },
  ]

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  const hasAccess = (item: MenuItem) => {
    if (!item.roles || item.roles.length === 0) return true
    return item.roles.includes(userRole)
  }

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    // Verificar se o usuário tem acesso a este item
    if (!hasAccess(item)) return null

    const isActive = item.href
      ? pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
      : false
    const hasChildren = item.children && item.children.length > 0
    const isOpen = openMenus.includes(item.label)

    // Filtrar children que o usuário tem acesso
    const accessibleChildren = hasChildren
      ? item.children!.filter((child) => hasAccess(child))
      : []

    // Se é um menu com children mas nenhum é acessível, não mostrar
    if (hasChildren && accessibleChildren.length === 0) return null

    if (hasChildren) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleMenu(item.label)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 text-sm transition-colors',
              'text-gray-300 hover:bg-gray-800'
            )}
          >
            <div className="flex items-center">
              <span className="mr-3 text-gray-400">{item.icon}</span>
              {item.label}
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform',
                isOpen && 'transform rotate-180'
              )}
            />
          </button>
          {isOpen && (
            <div className="bg-gray-950/50">
              {accessibleChildren.map((child) => renderMenuItem(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.href}
        href={item.href || '/'}
        className={cn(
          'flex items-center px-4 py-3 text-sm transition-colors',
          depth > 0 && 'pl-12',
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:bg-gray-800'
        )}
      >
        <span className={cn('mr-3', isActive ? 'text-white' : 'text-gray-400')}>
          {item.icon}
        </span>
        {item.label}
      </Link>
    )
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  // Determinar cor primária (usar da company ou padrão)
  const primaryColor = company?.primaryColor || '#1E40AF'

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white min-h-screen flex flex-col',
          'transform transition-transform duration-300 ease-in-out lg:transform-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header com Logo da Company */}
        <div
          className="p-4 border-b border-gray-800 relative"
          style={{ backgroundColor: primaryColor }}
        >
          {/* Botão fechar mobile */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-white/70 hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 pr-8 lg:pr-0">
            {company?.logoUrl ? (
              <Image
                src={company.logoUrl}
                alt={company.name}
                width={40}
                height={40}
                className="rounded-lg object-contain bg-white"
              />
            ) : (
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">
                {company?.name || 'Serviço Agora'}
              </h1>
              <p className="text-white/70 text-xs truncate">
                {userRole === 'SUPER_ADMIN' ? 'Admin Master' : 'Sistema de OS'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => renderMenuItem(item))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{user?.name || 'Usuário'}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
