'use client'

import { useState, useCallback } from 'react'
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleOpenSidebar = useCallback(() => {
    setSidebarOpen(true)
  }, [])

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={handleOpenSidebar} />
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
