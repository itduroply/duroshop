"use client"

import { useState, useEffect, useCallback } from 'react'
import { User } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface RoleData {
  id: string
  name: string
}

interface PermissionRow {
  id: string | null
  role_id: string
  screen: string
  has_access: boolean
}

const ALL_SCREENS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
  { key: 'requisitions', label: 'Requisitions', icon: 'fa-file-lines' },
  { key: 'approvals', label: 'Approvals', icon: 'fa-check-circle' },
  { key: 'inventory', label: 'Inventory', icon: 'fa-box' },
  { key: 'branch-stock', label: 'Branch Stock', icon: 'fa-warehouse' },
  { key: 'dispatches', label: 'Dispatches', icon: 'fa-truck' },
  { key: 'distributions', label: 'Distributions', icon: 'fa-share-nodes' },
  { key: 'stock-requests', label: 'Stock Requests', icon: 'fa-cart-shopping' },
  { key: 'categories', label: 'Categories', icon: 'fa-tags' },
  { key: 'branches', label: 'Branches', icon: 'fa-building' },
  { key: 'receivers', label: 'Receivers', icon: 'fa-user-check' },
  { key: 'users', label: 'Users', icon: 'fa-users' },
  { key: 'activity-logs', label: 'Activity Logs', icon: 'fa-clock-rotate-left' },
  { key: 'permissions', label: 'Permissions', icon: 'fa-shield-halved' },
  { key: 'visiting-cards', label: 'Visiting Cards', icon: 'fa-id-card' },
  { key: 'visiting-card-approvals', label: 'VC Approvals', icon: 'fa-id-card-clip' },
]

const ROLE_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  'Super Admin': { label: 'Super Admin', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  'HR': { label: 'HR', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  'Manager': { label: 'Manager', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  'Employee': { label: 'Employee', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
}

export default function PermissionsPage() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [roles, setRoles] = useState<RoleData[]>([])
  const [permissions, setPermissions] = useState<PermissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data: profile } = await supabase
        .from('users')
        .select('id, full_name, email, phone, role_id, branch_id, reporting_manager, is_active, created_at')
        .eq('id', authUser.id)
        .single()
      if (profile) {
        setUser({
          id: profile.id,
          name: profile.full_name,
          email: profile.email || '',
          phone: profile.phone || '',
          role_id: profile.role_id || '',
          branch_id: profile.branch_id || null,
          reporting_manager: profile.reporting_manager || null,
          is_active: profile.is_active,
          created_at: profile.created_at,
        })
      }
    }

    const [rolesRes, permsRes] = await Promise.all([
      supabase.from('roles').select('id, name').order('name'),
      supabase.from('role_permissions').select('id, role_id, screen, has_access'),
    ])

    const rolesData = rolesRes.data || []
    const permsData = permsRes.data || []

    setRoles(rolesData)

    // Build full permission grid: every role × every screen
    const permMap = new Map<string, PermissionRow>()
    for (const p of permsData) {
      permMap.set(`${p.role_id}:${p.screen}`, p)
    }

    const fullPerms: PermissionRow[] = []
    for (const role of rolesData) {
      for (const screen of ALL_SCREENS) {
        const existing = permMap.get(`${role.id}:${screen.key}`)
        if (existing) {
          fullPerms.push(existing)
        } else {
          fullPerms.push({
            id: null,
            role_id: role.id,
            screen: screen.key,
            has_access: role.name === 'Super Admin',
          })
        }
      }
    }

    setPermissions(fullPerms)
    setDirty(false)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const getAccess = (roleId: string, screen: string): boolean => {
    const perm = permissions.find(p => p.role_id === roleId && p.screen === screen)
    return perm?.has_access ?? false
  }

  const toggleAccess = (roleId: string, screen: string) => {
    // Do not allow changing Super Admin permissions
    const role = roles.find(r => r.id === roleId)
    if (role?.name === 'Super Admin') return

    setPermissions(prev => prev.map(p => {
      if (p.role_id === roleId && p.screen === screen) {
        return { ...p, has_access: !p.has_access }
      }
      return p
    }))
    setDirty(true)
  }

  const toggleAllForRole = (roleId: string, grant: boolean) => {
    const role = roles.find(r => r.id === roleId)
    if (role?.name === 'Super Admin') return

    setPermissions(prev => prev.map(p => {
      if (p.role_id === roleId) {
        return { ...p, has_access: grant }
      }
      return p
    }))
    setDirty(true)
  }

  const toggleAllForScreen = (screen: string, grant: boolean) => {
    setPermissions(prev => prev.map(p => {
      if (p.screen === screen) {
        const role = roles.find(r => r.id === p.role_id)
        if (role?.name === 'Super Admin') return p
        return { ...p, has_access: grant }
      }
      return p
    }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)

    const upserts = permissions.map(p => ({
      role_id: p.role_id,
      screen: p.screen,
      has_access: p.has_access,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('role_permissions')
      .upsert(upserts, { onConflict: 'role_id,screen' })

    if (error) {
      console.error('Error saving permissions:', error)
      setToast({ type: 'error', message: 'Failed to save permissions. Please try again.' })
    } else {
      setToast({ type: 'success', message: 'Permissions saved successfully!' })
      setDirty(false)
    }
    setSaving(false)
  }

  const handleReset = () => {
    fetchData()
  }

  const getRoleScreenCount = (roleId: string) => {
    return permissions.filter(p => p.role_id === roleId && p.has_access).length
  }

  const getScreenRoleCount = (screen: string) => {
    return permissions.filter(p => p.screen === screen && p.has_access).length
  }

  // Sort roles in display order
  const roleOrder = ['Super Admin', 'HR', 'Manager', 'Employee']
  const sortedRoles = [...roles].sort((a, b) => roleOrder.indexOf(a.name) - roleOrder.indexOf(b.name))

  if (loading) {
    return (
      <>
        <div className="p-8 flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading permissions...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Permissions</h1>
            <p className="text-gray-600">Manage screen access for each role across the application</p>
          </div>
          <div className="flex items-center space-x-3">
            {dirty && (
              <button
                onClick={handleReset}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
              >
                <i className="fa-solid fa-rotate-left mr-2"></i>Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                dirty
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk"></i>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Role Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {sortedRoles.map(role => {
            const display = ROLE_DISPLAY[role.name] || { label: role.name, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' }
            const count = getRoleScreenCount(role.id)
            return (
              <div key={role.id} className={`border rounded-xl p-4 ${display.bg}`}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`text-sm font-semibold ${display.color}`}>{display.label}</h3>
                  <span className={`text-xs font-medium ${display.color}`}>
                    {count}/{ALL_SCREENS.length}
                  </span>
                </div>
                <div className="w-full bg-white/60 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      role.name === 'Super Admin' ? 'bg-red-500' :
                      role.name === 'HR' ? 'bg-purple-500' :
                      role.name === 'Manager' ? 'bg-blue-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(count / ALL_SCREENS.length) * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Permissions Matrix */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-56">
                    Screen
                  </th>
                  {sortedRoles.map(role => {
                    const display = ROLE_DISPLAY[role.name] || { label: role.name, color: 'text-gray-700', bg: '' }
                    const isSuperAdmin = role.name === 'Super Admin'
                    const allGranted = ALL_SCREENS.every(s => getAccess(role.id, s.key))
                    return (
                      <th key={role.id} className="px-4 py-4 text-center w-40">
                        <div className="flex flex-col items-center space-y-1.5">
                          <span className={`text-xs font-semibold ${display.color}`}>{display.label}</span>
                          {!isSuperAdmin && (
                            <button
                              onClick={() => toggleAllForRole(role.id, !allGranted)}
                              className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {allGranted ? 'Revoke All' : 'Grant All'}
                            </button>
                          )}
                        </div>
                      </th>
                    )
                  })}
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                    Roles
                  </th>
                </tr>
              </thead>
              <tbody>
                {ALL_SCREENS.map((screen, idx) => {
                  const roleCount = getScreenRoleCount(screen.key)
                  const allGranted = sortedRoles
                    .filter(r => r.name !== 'Super Admin')
                    .every(r => getAccess(r.id, screen.key))
                  return (
                    <tr
                      key={screen.key}
                      className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                            <i className={`fa-solid ${screen.icon} text-gray-500 text-sm`}></i>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-800">{screen.label}</span>
                            <button
                              onClick={() => toggleAllForScreen(screen.key, !allGranted)}
                              className="block text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {allGranted ? 'Revoke all roles' : 'Grant all roles'}
                            </button>
                          </div>
                        </div>
                      </td>
                      {sortedRoles.map(role => {
                        const hasAccess = getAccess(role.id, screen.key)
                        const isSuperAdmin = role.name === 'Super Admin'
                        return (
                          <td key={role.id} className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => toggleAccess(role.id, screen.key)}
                              disabled={isSuperAdmin}
                              className={`w-9 h-9 rounded-lg transition-all duration-200 flex items-center justify-center mx-auto ${
                                isSuperAdmin
                                  ? 'bg-red-100 text-red-500 cursor-not-allowed'
                                  : hasAccess
                                  ? 'bg-green-100 text-green-600 hover:bg-green-200 hover:scale-105'
                                  : 'bg-gray-100 text-gray-300 hover:bg-gray-200 hover:text-gray-400 hover:scale-105'
                              }`}
                              title={
                                isSuperAdmin
                                  ? 'Super Admin always has full access'
                                  : hasAccess
                                  ? `Revoke ${screen.label} from ${ROLE_DISPLAY[role.name]?.label || role.name}`
                                  : `Grant ${screen.label} to ${ROLE_DISPLAY[role.name]?.label || role.name}`
                              }
                            >
                              <i className={`fa-solid ${
                                isSuperAdmin ? 'fa-lock' : hasAccess ? 'fa-check' : 'fa-xmark'
                              } text-sm`}></i>
                            </button>
                          </td>
                        )
                      })}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold">
                          {roleCount}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info note */}
        <div className="mt-4 flex items-start space-x-3 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <i className="fa-solid fa-circle-info text-amber-500 mt-0.5"></i>
          <p>
            <strong className="text-amber-700">Note:</strong> Super Admin always has full access to all screens and cannot be modified.
            Changes take effect immediately after saving for all users of the affected roles.
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-5 py-3 rounded-xl shadow-lg border transition-all duration-300 ${
          toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-check-circle text-green-500' : 'fa-exclamation-circle text-red-500'}`}></i>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </>
  )
}
