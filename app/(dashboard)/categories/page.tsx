'use client'

import { useEffect, useMemo, useState } from 'react'
import { User } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface CategoryData {
  id: string
  name: string
  description: string | null
  icon_url: string | null
  display_order: number | null
  is_active: boolean
  created_at: string | null
}

export default function CategoriesPage() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CategoryData | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon_url: '',
    display_order: '',
    is_active: true,
  })
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [iconPreview, setIconPreview] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (iconPreview) URL.revokeObjectURL(iconPreview)
    }
  }, [iconPreview])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
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
        .from('categories')
        .select('id, name, description, icon_url, display_order, is_active, created_at')
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching categories:', error)
        setErrorMessage('Failed to load categories')
        return
      }

      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      setErrorMessage('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const openAddDialog = () => {
    setIsEditing(false)
    setActiveCategory(null)
    setFormData({ name: '', description: '', icon_url: '', display_order: '', is_active: true })
    setIconFile(null)
    setIconPreview(null)
    setErrorMessage(null)
    setIsModalOpen(true)
  }

  const openEditDialog = (category: CategoryData) => {
    setIsEditing(true)
    setActiveCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      icon_url: category.icon_url || '',
      display_order: category.display_order?.toString() || '',
      is_active: category.is_active,
    })
    setIconFile(null)
    setIconPreview(category.icon_url || null)
    setErrorMessage(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setIsDeleteOpen(false)
    setActiveCategory(null)
    setIsEditing(false)
    setErrorMessage(null)
    setFormData({ name: '', description: '', icon_url: '', display_order: '', is_active: true })
    setIconFile(null)
    setIconPreview(null)
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setErrorMessage('Category name is required')
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage(null)

      let uploadedIconUrl: string | null = formData.icon_url || null
      if (iconFile) {
        const fileExt = iconFile.name.split('.').pop()
        const fileName = `${formData.name.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase
          .storage
          .from('category_icon')
          .upload(fileName, iconFile, { upsert: true })

        if (uploadError) {
          console.error('Icon upload failed:', uploadError)
          setErrorMessage('Icon upload failed. Please try again.')
          return
        }

        const { data: publicData } = supabase
          .storage
          .from('category_icon')
          .getPublicUrl(fileName)

        uploadedIconUrl = publicData?.publicUrl || null
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        icon_url: uploadedIconUrl,
        display_order: formData.display_order ? Number(formData.display_order) : null,
        is_active: formData.is_active,
      }

      if (isEditing && activeCategory) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', activeCategory.id)

        if (error) {
          console.error('Error updating category:', error)
          setErrorMessage('Failed to update category')
          return
        }
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(payload)

        if (error) {
          console.error('Error creating category:', error)
          setErrorMessage('Failed to create category')
          return
        }
      }

      closeModal()
      await fetchCategories()
    } catch (error) {
      console.error('Error saving category:', error)
      setErrorMessage('Failed to save category')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!activeCategory) return

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', activeCategory.id)

      if (error) {
        console.error('Error deleting category:', error)
        setErrorMessage('Failed to delete category')
        return
      }

      closeModal()
      await fetchCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      setErrorMessage('Failed to delete category')
    } finally {
      setIsSaving(false)
    }
  }

  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return categories
    return categories.filter((category) => category.name.toLowerCase().includes(term))
  }, [categories, searchTerm])

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
              <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage item categories for requisitions and inventory</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-52">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Search categories..."
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
                <span>Add Category</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                    <th className="px-4 py-3">Category Name</th>
                    <th className="px-4 py-3">Icon</th>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                        No categories found
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xs font-bold">
                              {category.name?.slice(0, 2)?.toUpperCase() || 'CT'}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{category.name}</div>
                              <div className="text-[11px] text-gray-500">{category.description || 'No description'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {category.icon_url ? (
                            <img
                              src={category.icon_url}
                              alt={category.name}
                              className="w-8 h-8 rounded-lg border border-gray-200 object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500">
                              <i className="fa-solid fa-tag text-xs"></i>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{category.display_order ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${category.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            {category.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(category.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditDialog(category)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <i className="fa-solid fa-pen text-xs"></i>
                            </button>
                            <button
                              onClick={() => {
                                setActiveCategory(category)
                                setIsDeleteOpen(true)
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg">
            <form onSubmit={handleSaveCategory}>
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  {isEditing ? 'Edit Category' : 'Add Category'}
                </h2>
                <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[11px] text-gray-600">Category Name *</label>
                  <input
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-600">Description</label>
                  <textarea
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-600">Category Icon</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setIconFile(file)
                        if (iconPreview) URL.revokeObjectURL(iconPreview)
                        setIconPreview(file ? URL.createObjectURL(file) : formData.icon_url || null)
                      }}
                    />
                    {iconPreview && (
                      <div className="mt-2 flex items-center gap-2">
                        <img src={iconPreview} alt="Preview" className="w-10 h-10 rounded-lg border border-gray-200 object-cover" />
                        <span className="text-[11px] text-gray-500">Preview</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600">Display Order</label>
                    <input
                      type="number"
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                  <span className="text-xs text-gray-600">Active</span>
                </div>

                {errorMessage && (
                  <p className="text-xs text-red-600">{errorMessage}</p>
                )}
              </div>

              <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteOpen && activeCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900">Delete Category</h3>
            <p className="text-xs text-gray-600 mt-2">
              Are you sure you want to delete <span className="font-semibold">{activeCategory.name}</span>?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCategory}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-60"
              >
                {isSaving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
