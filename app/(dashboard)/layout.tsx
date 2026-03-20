'use client'

import { ReactNode, useEffect, useState } from 'react'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { User } from '@/types'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BranchFilterProvider } from '@/hooks/use-branch-filter'
import { useCurrentUser, clearCurrentUserCache } from '@/hooks/use-current-user'

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()

  const user: User | null = currentUser
    ? {
        id: currentUser.id,
        name: currentUser.full_name,
        email: currentUser.email,
        phone: '',
        role_id: currentUser.role_id,
        branch_id: currentUser.branch_id,
        reporting_manager: null,
        is_active: true,
        created_at: '',
      }
    : null

  useEffect(() => {
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
        <Header user={user} roleName={currentUser?.role_name} />
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
