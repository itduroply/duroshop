'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Users,
  Building2,
  BarChart3,
  History,
  Truck,
  CheckSquare,
  Plus,
  ChevronRight,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const navConfig: Record<UserRole, NavItem[]> = {
  super_admin: [
    { label: 'Dashboard',    href: '/super-admin/dashboard',   icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Branches',     href: '/super-admin/branches',    icon: <Building2 className="h-4 w-4" /> },
    { label: 'Inventory',    href: '/super-admin/inventory',   icon: <Package className="h-4 w-4" /> },
    { label: 'Users',        href: '/super-admin/users',       icon: <Users className="h-4 w-4" /> },
    { label: 'Requisitions', href: '/super-admin/requisitions',icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Reports',      href: '/super-admin/reports',     icon: <BarChart3 className="h-4 w-4" /> },
    { label: 'Audit Logs',   href: '/super-admin/audit-logs',  icon: <History className="h-4 w-4" /> },
  ],
  branch_admin: [
    { label: 'Dashboard',    href: '/branch-admin/dashboard',          icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Inventory',    href: '/branch-admin/inventory',          icon: <Package className="h-4 w-4" /> },
    { label: 'Receive Stock',href: '/branch-admin/inventory/receive',  icon: <Plus className="h-4 w-4" /> },
    { label: 'Requisitions', href: '/branch-admin/requisitions',       icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'Users',        href: '/branch-admin/users',              icon: <Users className="h-4 w-4" /> },
    { label: 'Distribution', href: '/branch-admin/distribution',       icon: <Truck className="h-4 w-4" /> },
  ],
  employee: [
    { label: 'Dashboard',   href: '/employee/dashboard',          icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'New Request', href: '/employee/raise-requisition',  icon: <Plus className="h-4 w-4" /> },
    { label: 'My Requests', href: '/employee/my-requests',        icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'History',     href: '/employee/history',            icon: <History className="h-4 w-4" /> },
  ],
  manager: [
    { label: 'Dashboard', href: '/manager/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Approvals',  href: '/manager/approvals', icon: <CheckSquare className="h-4 w-4" /> },
  ],
  hr: [
    { label: 'Dashboard', href: '/hr/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Approvals',  href: '/hr/approvals', icon: <CheckSquare className="h-4 w-4" /> },
  ],
  dispatch: [
    { label: 'Dashboard', href: '/dispatch/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  ],
}

const roleLabels: Record<UserRole, string> = {
  super_admin:  'Super Admin',
  branch_admin: 'Branch Admin',
  employee:     'Employee',
  manager:      'Manager',
  hr:           'HR',
  dispatch:     'Dispatch',
}

interface AppSidebarProps {
  role: UserRole
  userName: string
  branchName?: string
}

export function AppSidebar({ role, userName, branchName }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/sign-in')
    router.refresh()
  }
  const navItems = navConfig[role] ?? []

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-[#E2E8F0] px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C0392B]">
            <span className="text-sm font-bold text-white">D</span>
          </div>
          <div>
            <p className="text-sm font-bold text-[#1A1A2E]">DuroShop</p>
            {branchName && <p className="text-xs text-[#64748B] leading-tight">{branchName}</p>}
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 pt-4">
        <span className="inline-flex items-center rounded-full bg-[#FEF2F2] px-2.5 py-0.5 text-xs font-medium text-[#C0392B]">
          {roleLabels[role]}
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== `/${role}/dashboard` && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#C0392B] text-white'
                  : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1A1A2E]'
              )}
            >
              {item.icon}
              {item.label}
              {isActive && <ChevronRight className="ml-auto h-4 w-4 opacity-70" />}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-[#E2E8F0] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-sm font-semibold text-[#1A1A2E]">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#1A1A2E]">{userName}</p>
            <p className="truncate text-xs text-[#64748B]">{roleLabels[role]}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#C0392B]"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden w-64 shrink-0 border-r border-[#E2E8F0] bg-white lg:block">
        <SidebarContent />
      </div>

      {/* Mobile toggle button */}
      <button
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white shadow-sm lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5 text-[#64748B]" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <button
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#F8FAFC]"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4 text-[#64748B]" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}
