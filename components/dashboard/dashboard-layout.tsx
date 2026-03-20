'use client'

import { ReactNode, useEffect, useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { User } from '@/types'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BranchFilterProvider } from '@/hooks/use-branch-filter'
import { clearCurrentUserCache } from '@/hooks/use-current-user'

interface DashboardLayoutProps {
  children: ReactNode
  user: User | null
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Ensure light mode is always used
    document.documentElement.classList.remove('dark')
  }, [])

  const handleLogout = async () => {
    clearCurrentUserCache()
    sessionStorage.removeItem('sidebar_permissions')
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <BranchFilterProvider>
      <div className="h-screen bg-gray-50 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1 overflow-hidden pt-16">
          <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} onLogout={handleLogout} />
          <main className="ml-64 flex-1 overflow-y-auto bg-gray-50 transition-all duration-300">
            {children}
          </main>
        </div>
      </div>
    </BranchFilterProvider>
  )
}
