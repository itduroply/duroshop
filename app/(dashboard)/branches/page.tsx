'use client'

import { useEffect, useMemo, useState } from 'react'
import { User } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface BranchData {
  id: string
  name: string
  created_at: string | null
}

export default function BranchesPage() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [branches, setBranches] = useState<BranchData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [activeBranch, setActiveBranch] = useState<BranchData | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: ''
  })

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
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

      const { data, error } = await supabase
        .from('branches')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching branches:', error)
        setErrorMessage('Failed to load branches')
        return
      }

      setBranches(data || [])
    } catch (error) {
      console.error('Error fetching branches:', error)
      setErrorMessage('Failed to load branches')
    } finally {
      setLoading(false)
    }
  }

  const openAddDialog = () => {
    setIsEditing(false)
    setActiveBranch(null)
    setFormData({ name: '' })
    setErrorMessage(null)
    setIsModalOpen(true)
  }

  const openEditDialog = (branch: BranchData) => {
    setIsEditing(true)
    setActiveBranch(branch)
    setFormData({ name: branch.name })
    setErrorMessage(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setIsDeleteOpen(false)
    setActiveBranch(null)
    setIsEditing(false)
    setErrorMessage(null)
    setFormData({ name: '' })
  }

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setErrorMessage('Branch name is required')
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage(null)

      if (isEditing && activeBranch) {
        const { error } = await supabase
          .from('branches')
          .update({ name: formData.name.trim() })
          .eq('id', activeBranch.id)

        if (error) {
          console.error('Error updating branch:', error)
          setErrorMessage('Failed to update branch')
          return
        }
      } else {
        const { error } = await supabase
          .from('branches')
          .insert({ name: formData.name.trim() })

        if (error) {
          console.error('Error creating branch:', error)
          setErrorMessage('Failed to create branch')
          return
        }
      }

      closeModal()
      await fetchBranches()
    } catch (error) {
      console.error('Error saving branch:', error)
      setErrorMessage('Failed to save branch')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteBranch = async () => {
    if (!activeBranch) return

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', activeBranch.id)

      if (error) {
        console.error('Error deleting branch:', error)
        setErrorMessage('Failed to delete branch')
        return
      }

      closeModal()
      await fetchBranches()
    } catch (error) {
      console.error('Error deleting branch:', error)
      setErrorMessage('Failed to delete branch')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredBranches = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return branches
    return branches.filter((branch) => branch.name.toLowerCase().includes(term))
  }, [branches, searchTerm])

  const formatDate = (dateValue: string | null) => {
    if (!dateValue) return '—'
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    })
  }

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage company branches across all locations</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-52">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Search branches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 shadow-sm w-full"
                />
              </div>
              <button
                onClick={openAddDialog}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-all text-sm"
              >
                <i className="fa-solid fa-plus text-xs"></i>
                <span>Add Branch</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                    <th className="px-4 py-3">Branch Name</th>
                    <th className="px-4 py-3">Created Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredBranches.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                        No branches found
                      </td>
                    </tr>
                  ) : (
                    filteredBranches.map((branch) => (
                      <tr key={branch.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xs font-bold">
                              {branch.name?.slice(0, 2)?.toUpperCase() || 'BR'}
                            </div>
                            <span className="font-medium text-gray-900">{branch.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(branch.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditDialog(branch)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <i className="fa-solid fa-pencil text-xs"></i>
                            </button>
                            <button
                              onClick={() => {
                                setActiveBranch(branch)
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

            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>
                Showing <span className="font-medium text-gray-900">{filteredBranches.length}</span> of{' '}
                <span className="font-medium text-gray-900">{branches.length}</span> branches
              </span>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.currentTarget === e.target) closeModal()
          }}
        >
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {isEditing ? 'Edit Branch' : 'Add Branch'}
            </h3>

            <form className="space-y-4" onSubmit={handleSaveBranch}>
              <div>
                <label htmlFor="branchName" className="block text-xs font-medium text-gray-700 mb-1">
                  Branch Name
                </label>
                <input
                  id="branchName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="e.g. Downtown Office"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all text-xs"
                  required
                />
              </div>

              {errorMessage && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm transition-colors disabled:opacity-60"
                >
                  {isEditing ? 'Update Branch' : 'Save Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteOpen && activeBranch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.currentTarget === e.target) closeModal()
          }}
        >
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-triangle-exclamation text-red-600 text-lg"></i>
            </div>

            <h3 className="text-base font-bold text-gray-900 mb-2">Delete Branch?</h3>
            <p className="text-xs text-gray-500 mb-5">
              Are you sure you want to delete <span className="font-medium text-gray-700">{activeBranch.name}</span>?
            </p>

            {errorMessage && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg mb-4">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors w-full"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBranch}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm transition-colors w-full disabled:opacity-60"
              >
                Delete Branch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
