'use client'

import { useState, useEffect } from 'react'
import { User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useBranchFilter } from '@/hooks/use-branch-filter'

interface UserData {
  id: string
  email: string
  full_name: string
  phone?: string
  role_id?: string
  branch_id?: string
  reporting_manager?: string
  is_active: boolean
  created_at: string
  roles?: { name: string } | null
  reporting_manager_user?: { full_name: string }
}

export default function UsersPage() {
  const supabase = createClient()
  const { selectedBranchId } = useBranchFilter()
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([])
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('All Roles')
  const [branchFilter, setBranchFilter] = useState('All Branches')
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [activeUser, setActiveUser] = useState<UserData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role_id: '',
    branch_id: '',
    reporting_manager: '',
    is_active: true,
  })

  useEffect(() => {
    fetchBranches()
    fetchRoles()
    fetchUsers()
  }, [selectedBranchId])

  const fetchBranches = async () => {
    try {
      const { data: branchesData, error } = await supabase
        .from('branches')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching branches:', error)
        return
      }

      setBranches(branchesData || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchRoles = async () => {
    try {
      const { data: rolesData, error } = await supabase
        .from('roles')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching roles:', error)
        return
      }

      setRoles(rolesData || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.full_name || 'User',
          phone: '',
          role_id: '',
          branch_id: null,
          reporting_manager: null,
          is_active: true,
          created_at: new Date().toISOString()
        })
      }

      let usersQuery = supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          phone,
          role_id,
          branch_id,
          reporting_manager,
          is_active,
          created_at,
          roles!role_id (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (selectedBranchId) {
        usersQuery = usersQuery.eq('branch_id', selectedBranchId)
      }

      const { data: usersData, error } = await usersQuery

      if (error) {
        console.error('Error fetching users:', error)
        setErrorMessage('Failed to load users')
        return
      }

      setUsers((usersData || []) as unknown as UserData[])
    } catch (error) {
      console.error('Error:', error)
      setErrorMessage('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const openAddDialog = () => {
    setIsEditing(false)
    setActiveUser(null)
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      role_id: '',
      branch_id: '',
      reporting_manager: '',
      is_active: true,
    })
    setErrorMessage(null)
    setIsDrawerOpen(true)
  }

  const openEditDialog = (userData: UserData) => {
    setIsEditing(true)
    setActiveUser(userData)
    setFormData({
      full_name: userData.full_name,
      email: userData.email,
      phone: userData.phone || '',
      password: '',
      role_id: userData.role_id || '',
      branch_id: userData.branch_id || '',
      reporting_manager: userData.reporting_manager || '',
      is_active: userData.is_active,
    })
    setErrorMessage(null)
    setIsDrawerOpen(true)
  }

  const handleSaveUser = async () => {
    try {
      setErrorMessage(null)
      if (!formData.full_name || !formData.email) {
        setErrorMessage('Please fill in all required fields')
        return
      }

      setIsSaving(true)

      if (isEditing && activeUser) {
        // Editing: only update profile data
        const { error } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            role_id: formData.role_id || null,
            branch_id: formData.branch_id || null,
            reporting_manager: formData.reporting_manager || null,
            is_active: formData.is_active,
          })
          .eq('id', activeUser.id)

        if (error) {
          setErrorMessage(error.message)
          return
        }
      } else {
        // New user: Call API to create auth user and profile
        if (!formData.password || formData.password.length < 6) {
          setErrorMessage('Password must be at least 6 characters')
          return
        }

        // Get the current session token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setErrorMessage('Not authenticated')
          return
        }

        const response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            full_name: formData.full_name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            role_id: formData.role_id || null,
            branch_id: formData.branch_id || null,
            reporting_manager: formData.reporting_manager || null,
            is_active: formData.is_active,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          setErrorMessage(result.error || 'Failed to create user')
          return
        }
      }

      setIsDrawerOpen(false)
      await fetchUsers()
    } catch (error) {
      console.error('Error saving user:', error)
      setErrorMessage('Failed to save user')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUser = async () => {
    try {
      if (!activeUser) return

      setIsSaving(true)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', activeUser.id)

      if (error) {
        setErrorMessage(error.message)
        return
      }

      setIsDeleteOpen(false)
      setActiveUser(null)
      await fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      setErrorMessage('Failed to delete user')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredUsers = users.filter(u =>
    ((u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
    (roleFilter === 'All Roles' || u.role_id === roleFilter) &&
    (branchFilter === 'All Branches' || u.branch_id === branchFilter)
  )

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin">
            <i className="fa-solid fa-spinner text-4xl text-red-600"></i>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto p-6 bg-[#F9FAFB]">
        <div className="max-w-6xl mx-auto space-y-4">
          
          {/* Page Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Users</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage user accounts and access</p>
            </div>
            
            {/* Top Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-48">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 shadow-sm w-full"
                />
              </div>
              
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="appearance-none px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 text-gray-700 font-medium shadow-sm cursor-pointer"
              >
                <option>All Roles</option>
                <option>Super Admin</option>
                <option>HR Manager</option>
                <option>Manager</option>
              </select>

              <button 
                onClick={openAddDialog}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-all text-sm"
              >
                <i className="fa-solid fa-plus text-xs"></i>
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Reporting Manager</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((userData) => (
                      <tr key={userData.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-semibold text-xs">
                              {userData?.full_name?.charAt(0)?.toUpperCase() || ""}
                            </div>
                            <span className="font-medium text-gray-900">{userData?.full_name || ""}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{userData?.email || ""}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            {userData?.roles?.name || 'No Role'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {users.find(u => u.id === userData.reporting_manager)?.full_name || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            userData.is_active 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}>
                            {userData.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openEditDialog(userData)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <i className="fa-solid fa-pencil text-xs"></i>
                            </button>
                            <button 
                              onClick={() => {
                                setActiveUser(userData)
                                setIsDeleteOpen(true)
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <i className="fa-regular fa-trash-can text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50/50 text-xs text-gray-500">
              {filteredUsers.length} of {users.length} users
            </div>
          </div>
        </div>
      </main>

      {/* Backdrop */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-30"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Add/Edit User Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-40 transform transition-transform duration-300 ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Drawer Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditing ? 'Edit User' : 'Add New User'}
          </h2>
          <button 
            onClick={() => setIsDrawerOpen(false)}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <i className="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {errorMessage && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">Full Name *</label>
              <input 
                type="text" 
                placeholder="e.g. John Doe" 
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">Email Address *</label>
              <input 
                type="email" 
                placeholder="e.g. john@duroshop.com" 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">Phone Number</label>
              <input 
                type="tel" 
                placeholder="e.g. +1 (555) 000-0000" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">Password {!isEditing ? '*' : ''}</label>
              <input 
                type="password" 
                placeholder="e.g. SecurePass123" 
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-shadow"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Role</label>
                <div className="relative">
                  <select 
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                    className="w-full appearance-none px-3 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-shadow"
                  >
                    <option value="">Select Role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none"></i>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Branch</label>
                <div className="relative">
                  <select 
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full appearance-none px-3 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-shadow max-h-20"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none"></i>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">Reporting Manager</label>
              <div className="relative">
                <select 
                  value={formData.reporting_manager}
                  onChange={(e) => setFormData({ ...formData, reporting_manager: e.target.value })}
                  className="w-full appearance-none px-3 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-shadow"
                >
                  <option value="">None</option>
                  {users.filter(u => u.id !== activeUser?.id).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none"></i>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Account Status</label>
              <div className="flex items-center justify-between p-2 border border-gray-200 rounded bg-gray-50/50">
                <div>
                  <span className="block text-xs font-medium text-gray-900">Active Account</span>
                  <span className="block text-xs text-gray-500 mt-0.5">User can log in to the dashboard</span>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform m-0.5 ${formData.is_active ? 'translate-x-5' : ''}`}></div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2">
          <button 
            onClick={() => setIsDrawerOpen(false)}
            className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 font-medium text-xs rounded hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveUser}
            disabled={isSaving}
            className="px-3 py-1.5 bg-red-600 text-white font-medium text-xs rounded hover:bg-red-700 transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <i className={`fa-solid ${isSaving ? 'fa-spinner animate-spin' : 'fa-check'} text-xs`}></i>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Delete Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full">
            <div className="p-4 text-center">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-triangle-exclamation text-lg"></i>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Delete User?</h3>
              <p className="text-gray-500 text-xs mb-4">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsDeleteOpen(false)}
                  className="flex-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 font-medium text-xs rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteUser}
                  disabled={isSaving}
                  className="flex-1 px-3 py-1.5 bg-gray-900 text-white font-medium text-xs rounded hover:bg-black transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
