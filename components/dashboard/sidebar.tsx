'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  expanded: boolean
  onToggle: () => void
  onLogout: () => void
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'fa-chart-line', screen: 'dashboard' },
  { href: '/requisitions', label: 'Requisitions', icon: 'fa-file-lines', screen: 'requisitions' },
  { href: '/approvals', label: 'Approvals', icon: 'fa-check-circle', badgeKey: 'pendingApprovals' as const, screen: 'approvals' },
  { href: '/inventory', label: 'Inventory', icon: 'fa-box', screen: 'inventory' },
  { href: '/branch-stock', label: 'Branch Stock', icon: 'fa-warehouse', screen: 'branch-stock' },
  { href: '/dispatches', label: 'Dispatches', icon: 'fa-truck', screen: 'dispatches' },
  { href: '/distributions', label: 'Distributions', icon: 'fa-share-nodes', screen: 'distributions' },
  { href: '/categories', label: 'Categories', icon: 'fa-tags', screen: 'categories' },
  { href: '/branches', label: 'Branches', icon: 'fa-building', screen: 'branches' },
  { href: '/receivers', label: 'Receivers', icon: 'fa-user-check', screen: 'receivers' },
  { href: '/users', label: 'Users', icon: 'fa-users', screen: 'users' },
  { href: '/permissions', label: 'Permissions', icon: 'fa-shield-halved', screen: 'permissions' },
  { href: '/visiting-cards', label: 'Visiting Cards', icon: 'fa-id-card', screen: 'visiting-cards' },
  { href: '/visiting-card-approvals', label: 'VC Approvals', icon: 'fa-id-card-clip', screen: 'visiting-card-approvals' },
]

const bottomItems = [
  { href: '/activity-logs', label: 'Activity Logs', icon: 'fa-clock-rotate-left', screen: 'activity-logs' },
]

export function Sidebar({ expanded, onToggle, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const [badges, setBadges] = useState<{ pendingApprovals: number }>({ pendingApprovals: 0 })
  const [allowedScreens, setAllowedScreens] = useState<Set<string> | null>(null)
  const [permissionsLoaded, setPermissionsLoaded] = useState(false)

  // Hydrate from sessionStorage after mount to avoid SSR mismatch
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('sidebar_permissions')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Date.now() - parsed.ts < 5 * 60 * 1000) {
          setAllowedScreens(parsed.screens === null ? null : new Set(parsed.screens))
          setPermissionsLoaded(true)
        }
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const supabase = createClient()

    const fetchData = async () => {
      // Check sessionStorage cache first for permissions
      const cached = sessionStorage.getItem('sidebar_permissions')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (Date.now() - parsed.ts < 5 * 60 * 1000) { // 5 min cache
            setAllowedScreens(parsed.screens === null ? null : new Set(parsed.screens))
            setPermissionsLoaded(true)
          }
        } catch { /* ignore */ }
      }

      // Fetch badge counts and user profile in parallel
      const [badgeRes, authRes] = await Promise.all([
        supabase.from('stock_requests').select('id', { count: 'exact', head: true })
          .or('status.eq.pending_rm_approval,status.eq.pending_hr_approval,status.eq.manager_approved'),
        supabase.auth.getUser(),
      ])

      setBadges({ pendingApprovals: badgeRes.count || 0 })

      const authUser = authRes.data?.user
      if (!authUser) { setPermissionsLoaded(true); return }

      // Fetch profile with role name in one query
      const { data: profile } = await supabase
        .from('users')
        .select('role_id, roles:role_id ( name )')
        .eq('id', authUser.id)
        .single()

      if (!profile?.role_id) { setPermissionsLoaded(true); return }

      const roleName = (profile.roles as any)?.name
      if (roleName === 'Super Admin') {
        setAllowedScreens(null)
        setPermissionsLoaded(true)
        sessionStorage.setItem('sidebar_permissions', JSON.stringify({ screens: null, ts: Date.now() }))
        return
      }

      // Fetch role permissions
      const { data: perms } = await supabase
        .from('role_permissions')
        .select('screen')
        .eq('role_id', profile.role_id)
        .eq('has_access', true)

      const screens = (perms || []).map((p: { screen: string }) => p.screen)
      setAllowedScreens(new Set(screens))
      setPermissionsLoaded(true)
      sessionStorage.setItem('sidebar_permissions', JSON.stringify({ screens, ts: Date.now() }))
    }

    fetchData()
  }, [])

  const isVisible = (screen: string) => {
    if (!permissionsLoaded) return false // hide until loaded to prevent flash
    if (allowedScreens === null) return true // super admin
    return allowedScreens.has(screen)
  }

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-1">
        {navItems.filter(item => isVisible(item.screen)).map((item) => {
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className={`fa-solid ${item.icon} text-lg w-5`}></i>
              <span className="font-medium">{item.label}</span>
              {item.badgeKey && badges[item.badgeKey] > 0 && (
                <span className="ml-auto bg-red-100 text-red-600 text-xs font-semibold px-2 py-1 rounded-full">
                  {badges[item.badgeKey]}
                </span>
              )}
            </Link>
          )
        })}

        <div className="pt-4 mt-4 border-t border-gray-200">
          {bottomItems.filter(item => isVisible(item.screen)).map((item) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-red-50 text-red-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <i className={`fa-solid ${item.icon} text-lg w-5`}></i>
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
