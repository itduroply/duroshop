'use client'

import { useState, useEffect } from 'react'
import { User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useBranchFilter } from '@/hooks/use-branch-filter'

interface InventoryItem {
  id: string
  name: string
  categoryId: string
  categoryName?: string
  description?: string
  imageUrl?: string
  unit: string
  totalQty: number
  isActive: boolean
  hrApproval: boolean
}

interface Category {
  id: string
  name: string
}

interface BranchInfo {
  id: string
  name: string
}

interface BranchStockRow {
  branchId: string
  branchName: string
  enabled: boolean
  quantity: number
  maxLimit: number
}

const categoryColors: { [key: string]: string } = {
  Furniture: 'bg-blue-100 text-blue-700',
  Electronics: 'bg-purple-100 text-purple-700',
  Stationery: 'bg-green-100 text-green-700',
  Lighting: 'bg-yellow-100 text-yellow-700',
  Hardware: 'bg-red-100 text-red-700',
  Office: 'bg-indigo-100 text-indigo-700',
}

const IMAGE_BUCKET = 'item_images'

export default function InventoryPage() {
  const supabase = createClient()
  const { selectedBranchId } = useBranchFilter()
  const [user, setUser] = useState<User | null>(null)
  const [selectedTab, setSelectedTab] = useState('master')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalItems: 0,
    activeItems: 0,
    lowStock: 0,
    transactionsToday: 0
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [createForm, setCreateForm] = useState({
    name: '',
    categoryId: '',
    unit: '',
    description: '',
    imageUrl: '',
    imageFile: null as File | null,
    totalQty: 0,
    hrApproval: false,
  })

  const [editForm, setEditForm] = useState({
    name: '',
    categoryId: '',
    unit: '',
    description: '',
    imageUrl: '',
    imageFile: null as File | null,
    hrApproval: false,
  })
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)

  const [adjustForm, setAdjustForm] = useState({
    type: 'add',
    quantity: 0,
    notes: '',
  })

  const [isBranchStockOpen, setIsBranchStockOpen] = useState(false)
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [branchStockRows, setBranchStockRows] = useState<BranchStockRow[]>([])
  const [isSavingBranchStock, setIsSavingBranchStock] = useState(false)

  // Fetch inventory items
  useEffect(() => {
    const init = async () => {
      const categoryData = await fetchCategories()
      await fetchInventoryItems(categoryData)
    }

    init()
  }, [selectedBranchId])

  useEffect(() => {
    return () => {
      if (createImagePreview) URL.revokeObjectURL(createImagePreview)
      if (editImagePreview) URL.revokeObjectURL(editImagePreview)
    }
  }, [createImagePreview, editImagePreview])

  const logActivity = async (action: string, entityType: string, entityId: string, details: Record<string, unknown>) => {
    // Activity logging disabled temporarily
    console.log('Activity logged (disabled):', { action, entityType, entityId, details })
  }

  const fetchInventoryItems = async (categoryData: Category[] = categories) => {
    try {
      setLoading(true)
      
      // Get current user and their branch
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        // User profile fetch disabled - can be re-enabled after schema is verified
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

      // Fetch inventory items - filter by branch if selected
      let inventoryData: any[] | null = null
      let fetchError: any = null

      if (selectedBranchId) {
        // When a branch is selected, show only items that exist in that branch's stock
        const { data: branchStockData, error } = await supabase
          .from('branch_stock')
          .select('item_id, quantity, items!item_id(*)')
          .eq('branch_id', selectedBranchId)

        fetchError = error
        inventoryData = (branchStockData || []).map((bs: any) => ({
          ...bs.items,
          total_qty: bs.quantity,
        }))
      } else {
        const { data, error } = await supabase
          .from('items')
          .select('*')

        fetchError = error
        inventoryData = data
      }

      if (fetchError) {
        console.error('Error fetching inventory:', fetchError)
        return
      }

      // Transform data to match interface
      const categoryLookup = categoryData.reduce<Record<string, string>>((acc, category) => {
        acc[category.id] = category.name
        return acc
      }, {})

      const transformedItems: InventoryItem[] = (inventoryData || []).map((item: any) => {
        return {
          id: item.id,
          name: item.name,
          categoryId: item.category_id,
          categoryName: categoryLookup[item.category_id],
          description: item.description,
          imageUrl: item.image_url || undefined,
          unit: item.unit,
          totalQty: item.total_qty || 0,
          isActive: item.is_active !== false,
          hrApproval: item.hr_approval === true
        }
      })

      setItems(transformedItems)

      // Fetch recent activity logs
      const { data: activityData } = await supabase
        .from('activity_logs')
        .select('id, action, entity_type, entity_id, details, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      const transformedLogs = (activityData || []).map((log: any) => ({
        createdAt: log.created_at as string,
      }))

      // Calculate stats
      const totalItems = transformedItems.length
      const activeItems = transformedItems.filter(item => item.isActive).length
      const lowStock = transformedItems.filter(item => item.totalQty < 10 && item.totalQty > 0).length

      const today = new Date().toDateString()
      const transactionsToday = transformedLogs.filter((log: { createdAt: string }) =>
        new Date(log.createdAt).toDateString() === today
      ).length

      setStats({
        totalItems,
        activeItems,
        lowStock,
        transactionsToday
      })

    } catch (error) {
      console.error('Error in fetchInventoryItems:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return
    }

    const nextCategories = (data || []) as Category[]
    setCategories(nextCategories)
    return nextCategories
  }

  const toggleRow = (id: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedRows.size === items.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(items.map((i) => i.id)))
    }
  }

  const getStockPercentage = (current: number) => {
    const max = 100 // Default max stock for percentage
    return Math.min((current / max) * 100, 100)
  }
  
  const getStockColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-green-500'
    if (percentage >= 40) return 'bg-yellow-500'
    if (percentage >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.categoryName || item.categoryId).toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openCreate = () => {
    setErrorMessage(null)
    setWarningMessage(null)
    setCreateForm({
      name: '',
      categoryId: '',
      unit: '',
      description: '',
      imageUrl: '',
      imageFile: null,
      totalQty: 0,
      hrApproval: false,
    })
    if (createImagePreview) URL.revokeObjectURL(createImagePreview)
    setCreateImagePreview(null)
    setIsCreateOpen(true)
  }

  const openEdit = (item: InventoryItem) => {
    setErrorMessage(null)
    setWarningMessage(null)
    setActiveItem(item)
    setEditForm({
      name: item.name,
      categoryId: item.categoryId,
      unit: item.unit,
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      imageFile: null,
      hrApproval: item.hrApproval,
    })
    if (editImagePreview) URL.revokeObjectURL(editImagePreview)
    setEditImagePreview(item.imageUrl || null)
    setIsEditOpen(true)
  }

  const openDelete = (item: InventoryItem) => {
    setErrorMessage(null)
    setWarningMessage(null)
    setActiveItem(item)
    setIsDeleteOpen(true)
  }

  const openAdjust = (item: InventoryItem) => {
    setErrorMessage(null)
    setWarningMessage(null)
    setActiveItem(item)
    setAdjustForm({ type: 'add', quantity: 0, notes: '' })
    setIsAdjustOpen(true)
  }

  const fetchBranches = async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('id, name')
      .order('name')
    if (error) {
      console.error('Error fetching branches:', error)
      return []
    }
    return (data || []) as BranchInfo[]
  }

  const openBranchStock = async (item: InventoryItem) => {
    setErrorMessage(null)
    setWarningMessage(null)
    setActiveItem(item)

    // Fetch branches and existing branch stock in parallel
    const [branchList, stockResult] = await Promise.all([
      fetchBranches(),
      supabase
        .from('branch_stock')
        .select('branch_id, quantity, max_limit')
        .eq('item_id', item.id)
    ])

    setBranches(branchList)

    const existingStock = (stockResult.data || []) as { branch_id: string; quantity: number; max_limit: number }[]
    const stockMap = new Map(existingStock.map(s => [s.branch_id, s]))

    const rows: BranchStockRow[] = branchList.map(branch => {
      const existing = stockMap.get(branch.id)
      return {
        branchId: branch.id,
        branchName: branch.name,
        enabled: !!existing,
        quantity: existing?.quantity ?? 0,
        maxLimit: existing?.max_limit ?? 0,
      }
    })

    setBranchStockRows(rows)
    setIsBranchStockOpen(true)
  }

  const updateBranchStockRow = (branchId: string, field: keyof BranchStockRow, value: boolean | number) => {
    setBranchStockRows(prev =>
      prev.map(row => row.branchId === branchId ? { ...row, [field]: value } : row)
    )
  }

  const handleSaveBranchStock = async () => {
    if (!activeItem) return
    try {
      setIsSavingBranchStock(true)
      setErrorMessage(null)

      const enabledRows = branchStockRows.filter(r => r.enabled)
      const disabledRows = branchStockRows.filter(r => !r.enabled)

      // Upsert enabled rows
      if (enabledRows.length > 0) {
        const upsertData = enabledRows.map(r => ({
          branch_id: r.branchId,
          item_id: activeItem.id,
          quantity: r.quantity,
          max_limit: r.maxLimit,
        }))

        const { error } = await supabase
          .from('branch_stock')
          .upsert(upsertData, { onConflict: 'branch_id,item_id' })

        if (error) {
          setErrorMessage(error.message)
          return
        }
      }

      // Delete disabled rows that previously existed
      if (disabledRows.length > 0) {
        const disabledBranchIds = disabledRows.map(r => r.branchId)
        await supabase
          .from('branch_stock')
          .delete()
          .eq('item_id', activeItem.id)
          .in('branch_id', disabledBranchIds)
      }

      setIsBranchStockOpen(false)
      setActiveItem(null)
    } catch (error) {
      console.error('Failed to save branch stock:', error)
      setErrorMessage('Failed to save branch stock.')
    } finally {
      setIsSavingBranchStock(false)
    }
  }

  const handleCreate = async () => {
    try {
      setErrorMessage(null)
      setWarningMessage(null)
      setIsCreating(true)
      if (!createForm.name || !createForm.categoryId || !createForm.unit) {
        setErrorMessage('Please fill all required fields.')
        return
      }

      let uploadedImageUrl: string | null = createForm.imageUrl || null
      if (createForm.imageFile) {
        const fileExt = createForm.imageFile.name.split('.').pop()
        const fileName = `${createForm.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase
          .storage
          .from(IMAGE_BUCKET)
          .upload(fileName, createForm.imageFile, { upsert: true })

        if (uploadError) {
          setWarningMessage('Image upload failed. The item will be created without an image.')
          uploadedImageUrl = null
        } else {
          const { data: publicData } = supabase
            .storage
            .from(IMAGE_BUCKET)
            .getPublicUrl(fileName)

          uploadedImageUrl = publicData?.publicUrl || null
        }
      }

      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .insert({
          name: createForm.name,
          category_id: createForm.categoryId,
          unit: createForm.unit,
          description: createForm.description || null,
          image_url: uploadedImageUrl,
          total_qty: createForm.totalQty,
          is_active: true,
          hr_approval: createForm.hrApproval,
        })
        .select()
        .single()

      if (itemError || !itemData) {
        setErrorMessage(itemError?.message || 'Failed to create item.')
        return
      }

      await logActivity('create', 'inventory_item', itemData.id, {
        name: createForm.name,
      })

      setIsCreateOpen(false)
      await fetchInventoryItems()
    } catch (error) {
      console.error('Create item failed:', error)
      setErrorMessage('Failed to create item.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleEdit = async () => {
    if (!activeItem) return
    try {
      setErrorMessage(null)
      setWarningMessage(null)
      if (!editForm.name || !editForm.categoryId || !editForm.unit) {
        setErrorMessage('Please fill all required fields.')
        return
      }

      let uploadedImageUrl: string | null = editForm.imageUrl || null
      if (editForm.imageFile) {
        const fileExt = editForm.imageFile.name.split('.').pop()
        const fileName = `${editForm.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase
          .storage
          .from(IMAGE_BUCKET)
          .upload(fileName, editForm.imageFile, { upsert: true })

        if (uploadError) {
          setWarningMessage('Image upload failed. Changes saved without updating the image.')
          uploadedImageUrl = editForm.imageUrl || null
        } else {
          const { data: publicData } = supabase
            .storage
            .from(IMAGE_BUCKET)
            .getPublicUrl(fileName)

          uploadedImageUrl = publicData?.publicUrl || null
        }
      }

      const { error: updateError } = await supabase
        .from('items')
        .update({
          name: editForm.name,
          category_id: editForm.categoryId,
          unit: editForm.unit,
          description: editForm.description || null,
          image_url: uploadedImageUrl,
          hr_approval: editForm.hrApproval,
        })
        .eq('id', activeItem.id)

      if (updateError) {
        setErrorMessage(updateError.message)
        return
      }

      await logActivity('update', 'inventory_item', activeItem.id, {
        name: editForm.name,
      })

      setIsEditOpen(false)
      setActiveItem(null)
      await fetchInventoryItems()
    } catch (error) {
      setErrorMessage('Failed to update item.')
    }
  }

  const handleDelete = async () => {
    if (!activeItem) return
    try {
      setErrorMessage(null)
      const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .eq('id', activeItem.id)

      if (deleteError) {
        setErrorMessage(deleteError.message)
        return
      }

      await logActivity('delete', 'inventory_item', activeItem.id, {
        name: activeItem.name,
      })

      setIsDeleteOpen(false)
      setActiveItem(null)
      await fetchInventoryItems()
    } catch (error) {
      setErrorMessage('Failed to delete item.')
    }
  }

  const handleAdjustStock = async () => {
    if (!activeItem) return
    try {
      setErrorMessage(null)
      if (adjustForm.quantity <= 0) {
        setErrorMessage('Quantity must be greater than 0.')
        return
      }

      const current = activeItem.totalQty || 0
      const nextQuantity = adjustForm.type === 'add'
        ? current + adjustForm.quantity
        : Math.max(current - adjustForm.quantity, 0)

      const { error: updateError } = await supabase
        .from('items')
        .update({ total_qty: nextQuantity })
        .eq('id', activeItem.id)

      if (updateError) {
        setErrorMessage(updateError.message)
        return
      }

      await logActivity('adjust_stock', 'items', activeItem.id, {
        item_id: activeItem.id,
        name: activeItem.name,
        previous: current,
        next: nextQuantity,
        type: adjustForm.type,
        quantity: adjustForm.quantity,
        notes: adjustForm.notes,
      })

      setIsAdjustOpen(false)
      setActiveItem(null)
      await fetchInventoryItems()
    } catch (error) {
      setErrorMessage('Failed to adjust stock.')
    }
  }

  if (loading) {
    return (
      <>
        <div className="px-8 flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading inventory...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="px-8 space-y-6">
        {/* Header Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventory Administration</h1>
              <p className="text-gray-600 mt-1 text-sm">Manage items, stock levels, and transactions across all branches</p>
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center space-x-1">
                <i className="fa-solid fa-download text-xs"></i>
                <span>Export</span>
              </button>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center space-x-1">
                <i className="fa-solid fa-upload text-xs"></i>
                <span>Import</span>
              </button>
              <button
                onClick={openCreate}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-all flex items-center space-x-1"
              >
                <i className="fa-solid fa-plus text-xs"></i>
                <span>Add Item</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-5">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-box text-blue-600 text-lg"></i>
              </div>
              <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">+12%</span>
            </div>
            <div className="text-xl font-bold text-gray-900 mb-1">{stats.totalItems}</div>
            <div className="text-xs text-gray-600">Total Items</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-check-circle text-green-600 text-lg"></i>
              </div>
              <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">+8%</span>
            </div>
            <div className="text-xl font-bold text-gray-900 mb-1">{stats.activeItems}</div>
            <div className="text-xs text-gray-600">Active Items</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-exclamation-triangle text-orange-600 text-lg"></i>
              </div>
              <span className="text-[10px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">-3%</span>
            </div>
            <div className="text-xl font-bold text-gray-900 mb-1">{stats.lowStock}</div>
            <div className="text-xs text-gray-600">Low Stock</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-arrow-right-arrow-left text-purple-600 text-lg"></i>
              </div>
              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">+24%</span>
            </div>
            <div className="text-xl font-bold text-gray-900 mb-1">{stats.transactionsToday}</div>
            <div className="text-xs text-gray-600">Transactions Today</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Tabs */}
          <div className="border-b border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedTab('master')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTab === 'master'
                      ? 'bg-red-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Item Master
                </button>
                <button
                  onClick={() => setSelectedTab('matrix')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTab === 'matrix'
                      ? 'bg-red-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Stock Matrix
                </button>
                <button
                  onClick={() => setSelectedTab('adjustments')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTab === 'adjustments'
                      ? 'bg-red-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Adjustments
                </button>
                <button
                  onClick={() => setSelectedTab('transactions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTab === 'transactions'
                      ? 'bg-red-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Transactions
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <i className="fa-solid fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <button className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                  <i className="fa-solid fa-filter text-gray-600 text-xs"></i>
                </button>
                <button className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                  <i className="fa-solid fa-sort text-gray-600 text-xs"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === items.length && items.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Unit</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Total Quantity</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {searchTerm ? 'No items found matching your search.' : 'No inventory items yet. Add your first item to get started.'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-all border-b border-gray-100">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(item.id)}
                          onChange={() => toggleRow(item.id)}
                          className="rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-9 h-9 rounded-lg border border-gray-300 object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center border border-gray-300">
                              <i className="fa-solid fa-box text-gray-600 text-xs"></i>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 text-xs">{item.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${categoryColors[item.categoryName || item.categoryId] || 'bg-gray-100 text-gray-700'}`}>
                          {item.categoryName || item.categoryId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-900">{item.unit}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className={`text-xs font-medium ${item.totalQty < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                            {item.totalQty}
                          </div>
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getStockColor(getStockPercentage(item.totalQty))}`}
                              style={{ width: `${getStockPercentage(item.totalQty)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={item.isActive} 
                            readOnly 
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"
                            title="Edit item"
                          >
                            <i className="fa-solid fa-pen text-gray-600 text-xs"></i>
                          </button>
                          <button
                            onClick={() => openAdjust(item)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"
                            title="Adjust stock"
                          >
                            <i className="fa-solid fa-arrows-rotate text-gray-600 text-xs"></i>
                          </button>
                          <button
                            onClick={() => openBranchStock(item)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"
                            title="Add Branch Stock"
                          >
                            <i className="fa-solid fa-code-branch text-gray-600 text-xs"></i>
                          </button>
                          <button
                            onClick={() => openDelete(item)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"
                            title="Delete item"
                          >
                            <i className="fa-solid fa-trash text-gray-600 text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="text-xs text-gray-600">Showing {filteredItems.length} of {items.length} items</div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium">Next</button>
            </div>
          </div>
        </div>



        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-4 py-2">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Create Item Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Add New Item</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-600">Name *</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-600">Category *</label>
                <select
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white"
                  value={createForm.categoryId}
                  onChange={(e) => setCreateForm({ ...createForm, categoryId: e.target.value })}
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-600">Unit *</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white"
                  value={createForm.unit}
                  onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-600">Total Quantity</label>
                <input
                  type="number"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white"
                  value={createForm.totalQty}
                  onChange={(e) => setCreateForm({ ...createForm, totalQty: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-gray-600">Description</label>
                <textarea
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white"
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.hrApproval}
                    onChange={(e) => setCreateForm({ ...createForm, hrApproval: e.target.checked })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-xs text-gray-700">Requires HR Approval</span>
                </label>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-gray-600">Item Image</label>
                <div className="mt-1 border border-red-200 rounded-lg px-3 py-2 bg-red-50/40 transition-all duration-200 hover:border-red-300 hover:bg-red-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-16 h-16 rounded-lg border border-red-200 bg-white overflow-hidden flex items-center justify-center transition-all duration-200 hover:shadow-md">
                        {createImagePreview ? (
                          <img src={createImagePreview} alt="Preview" className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                        ) : (
                          <i className="fa-solid fa-image text-red-400 text-xs animate-pulse"></i>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-600">
                        {createForm.imageFile ? createForm.imageFile.name : 'No file selected'}
                      </div>
                    </div>
                    <label
                      htmlFor="create-image-upload"
                      className="px-3 py-1.5 text-[10px] font-medium border border-red-200 rounded-lg bg-white hover:bg-red-50 text-red-600 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-sm"
                    >
                      Upload
                    </label>
                  </div>
                  <input
                    id="create-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      if (createImagePreview) URL.revokeObjectURL(createImagePreview)
                      setCreateForm({ ...createForm, imageFile: file })
                      setCreateImagePreview(file ? URL.createObjectURL(file) : null)
                    }}
                  />
                </div>
              </div>
            </div>
            {warningMessage && (
              <div className="mt-3 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs rounded-lg px-3 py-2">
                {warningMessage}
              </div>
            )}
            {errorMessage && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
                {errorMessage}
              </div>
            )}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-lg transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-3 py-2 text-xs bg-red-600 text-white rounded-lg disabled:opacity-60 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                disabled={isCreating}
              >
                {isCreating ? (
                  <span className="inline-flex items-center space-x-2">
                    <i className="fa-solid fa-spinner animate-spin"></i>
                    <span>Creating...</span>
                  </span>
                ) : (
                  'Create Item'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {isEditOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Edit Item</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-600">Name *</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-600">Category *</label>
                <select
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white"
                  value={editForm.categoryId}
                  onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-600">Unit *</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white"
                  value={editForm.unit}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-gray-600">Description</label>
                <textarea
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.hrApproval}
                    onChange={(e) => setEditForm({ ...editForm, hrApproval: e.target.checked })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-xs text-gray-700">Requires HR Approval</span>
                </label>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-gray-600">Replace Image</label>
                <div className="mt-1 border border-red-200 rounded-lg px-3 py-2 bg-red-50/40 transition-all duration-200 hover:border-red-300 hover:bg-red-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-16 h-16 rounded-lg border border-red-200 bg-white overflow-hidden flex items-center justify-center transition-all duration-200 hover:shadow-md">
                        {editImagePreview ? (
                          <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                        ) : (
                          <i className="fa-solid fa-image text-red-400 text-xs animate-pulse"></i>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-600">
                        {editForm.imageFile ? editForm.imageFile.name : (activeItem?.imageUrl ? 'Current image' : 'No file selected')}
                      </div>
                    </div>
                    <label
                      htmlFor="edit-image-upload"
                      className="px-3 py-1.5 text-[10px] font-medium border border-red-200 rounded-lg bg-white hover:bg-red-50 text-red-600 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-sm"
                    >
                      Upload
                    </label>
                  </div>
                  <input
                    id="edit-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      if (editImagePreview) URL.revokeObjectURL(editImagePreview)
                      setEditForm({ ...editForm, imageFile: file })
                      setEditImagePreview(file ? URL.createObjectURL(file) : (activeItem?.imageUrl || null))
                    }}
                  />
                </div>
              </div>
            </div>
            {warningMessage && (
              <div className="mt-3 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs rounded-lg px-3 py-2">
                {warningMessage}
              </div>
            )}
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={() => setIsEditOpen(false)} className="px-3 py-2 text-xs border border-gray-200 rounded-lg">
                Cancel
              </button>
              <button onClick={handleEdit} className="px-3 py-2 text-xs bg-red-600 text-white rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Delete Item</h3>
              <button onClick={() => setIsDeleteOpen(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Are you sure you want to delete <span className="font-semibold">{activeItem.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={() => setIsDeleteOpen(false)} className="px-3 py-2 text-xs border border-gray-200 rounded-lg transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0">
                Cancel
              </button>
              <button onClick={handleDelete} className="px-3 py-2 text-xs bg-red-600 text-white rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branch Stock Modal */}
      {isBranchStockOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg w-full max-w-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Add Branch Stock</h3>
                <p className="text-xs text-gray-500 mt-0.5">{activeItem.name}</p>
              </div>
              <button onClick={() => setIsBranchStockOpen(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider w-16">Enable</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Branch</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider w-36">Current Stock</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider w-36">Max Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {branchStockRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-500">
                        No branches found. Please add branches first.
                      </td>
                    </tr>
                  ) : (
                    branchStockRows.map((row) => (
                      <tr key={row.branchId} className={`hover:bg-gray-50 transition-all ${!row.enabled ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) => updateBranchStockRow(row.branchId, 'enabled', e.target.checked)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-900 font-medium">{row.branchName}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            value={row.quantity}
                            disabled={!row.enabled}
                            onChange={(e) => updateBranchStockRow(row.branchId, 'quantity', Math.max(0, Number(e.target.value)))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            value={row.maxLimit}
                            disabled={!row.enabled}
                            onChange={(e) => updateBranchStockRow(row.branchId, 'maxLimit', Math.max(0, Number(e.target.value)))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {errorMessage && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
                {errorMessage}
              </div>
            )}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setIsBranchStockOpen(false)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-lg transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0"
                disabled={isSavingBranchStock}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBranchStock}
                className="px-3 py-2 text-xs bg-red-600 text-white rounded-lg disabled:opacity-60 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                disabled={isSavingBranchStock}
              >
                {isSavingBranchStock ? (
                  <span className="inline-flex items-center space-x-2">
                    <i className="fa-solid fa-spinner animate-spin"></i>
                    <span>Saving...</span>
                  </span>
                ) : (
                  'Save Branch Stock'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Adjust Stock</h3>
              <button onClick={() => setIsAdjustOpen(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="text-xs text-gray-600 mb-3">
              {activeItem.name} • Current Stock: {activeItem.totalQty}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-600">Adjustment Type</label>
                <select
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white"
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                >
                  <option value="add">Add Stock</option>
                  <option value="remove">Remove Stock</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-600">Quantity</label>
                <input
                  type="number"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-600">Notes</label>
                <textarea
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 bg-white"
                  rows={3}
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={() => setIsAdjustOpen(false)} className="px-3 py-2 text-xs border border-gray-200 rounded-lg transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0">
                Cancel
              </button>
              <button onClick={handleAdjustStock} className="px-3 py-2 text-xs bg-red-600 text-white rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0">
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

