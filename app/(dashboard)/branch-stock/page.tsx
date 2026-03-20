"use client"

import { useState, useEffect, useCallback } from 'react'
import { User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useBranchFilter } from '@/hooks/use-branch-filter'

interface BranchStockRow {
  id: string
  branchName: string
  branchId: string
  itemId: string
  itemName: string
  itemUnit: string
  itemDescription: string | null
  itemImageUrl: string | null
  categoryName: string
  available: number
  consumed: number
  maxLimit: number
  remaining: number
  status: 'normal' | 'low' | 'critical'
}

interface Branch {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

const statusConfig = {
  normal: {
    label: 'Normal',
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    dot: 'bg-green-600',
  },
  low: {
    label: 'Low Stock',
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    dot: 'bg-yellow-600',
  },
  critical: {
    label: 'Critical',
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    dot: 'bg-red-600',
  },
}

function getStockStatus(available: number, maxLimit: number): 'normal' | 'low' | 'critical' {
  if (maxLimit <= 0) return 'normal'
  const pct = (available / maxLimit) * 100
  if (pct <= 10) return 'critical'
  if (pct <= 30) return 'low'
  return 'normal'
}

const PAGE_SIZE = 10

export default function BranchStockPage() {
  const supabase = createClient()
  const { selectedBranchId } = useBranchFilter()
  const [user, setUser] = useState<User | null>(null)
  const [rows, setRows] = useState<BranchStockRow[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<BranchStockRow | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)

    // Fetch user
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

    // Fetch branches & categories for filters
    const [branchRes, catRes] = await Promise.all([
      supabase.from('branches').select('id, name').order('name'),
      supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    ])
    setBranches(branchRes.data || [])
    setCategories(catRes.data || [])

    // Fetch branch stock with joins
    let stockQuery = supabase
      .from('branch_stock')
      .select(`
        id,
        quantity,
        max_limit,
        branch:branches!branch_id ( id, name ),
        item:items!item_id ( id, name, unit, description, image_url, total_qty, category_id, category:categories!category_id ( name ) )
      `)
      .order('quantity', { ascending: true })

    if (selectedBranchId) {
      stockQuery = stockQuery.eq('branch_id', selectedBranchId)
    }

    const { data, error } = await stockQuery

    if (error) {
      console.error('Error fetching branch stock:', error)
      setRows([])
    } else {
      setRows((data || []).map((r: any) => {
        const maxLimit = r.max_limit || 0
        const available = r.quantity || 0
        const consumed = maxLimit > 0 ? Math.max(maxLimit - available, 0) : 0
        const remaining = maxLimit > 0 ? Math.max(available - consumed, 0) : available
        return {
          id: r.id,
          branchName: r.branch?.name || '—',
          branchId: r.branch?.id || '',
          itemId: r.item?.id || '',
          itemName: r.item?.name || 'Unknown',
          itemUnit: r.item?.unit || '—',
          itemDescription: r.item?.description || null,
          itemImageUrl: r.item?.image_url || null,
          categoryName: r.item?.category?.name || '—',
          available,
          consumed,
          maxLimit,
          remaining,
          status: getStockStatus(available, maxLimit),
        }
      }))
    }
    setLoading(false)
  }, [supabase, selectedBranchId])

  useEffect(() => { fetchData() }, [fetchData])

  // Close drawer on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Filtering
  const filteredRows = rows.filter(r => {
    if (branchFilter && r.branchId !== branchFilter) return false
    if (statusFilter && r.status !== statusFilter) return false
    if (categoryFilter && r.categoryName !== categoryFilter) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      if (!r.itemName.toLowerCase().includes(q) && !r.branchName.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [searchTerm, branchFilter, categoryFilter, statusFilter])

  // Stats
  const totalItems = rows.length
  const totalAvailable = rows.reduce((s, r) => s + r.available, 0)
  const totalConsumed = rows.reduce((s, r) => s + r.consumed, 0)
  const totalMax = rows.reduce((s, r) => s + r.maxLimit, 0)
  const capacityPct = totalMax > 0 ? Math.round((totalAvailable / totalMax) * 100) : 0

  const openDrawer = (row: BranchStockRow) => {
    setSelectedRow(row)
    setDrawerOpen(true)
  }

  const utilizationPct = selectedRow && selectedRow.maxLimit > 0
    ? Math.round((selectedRow.available / selectedRow.maxLimit) * 100)
    : 0

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-4 max-w-7xl mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Branch Stock Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">Monitor stock levels across all branches</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500">Total Items</p>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">{totalItems.toLocaleString()}</h3>
              </div>
              <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
                <i className="fa-solid fa-cubes text-sm"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500">Available Stock</p>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">{totalAvailable.toLocaleString()}</h3>
              </div>
              <div className="p-1.5 bg-green-50 rounded-md text-green-600">
                <i className="fa-solid fa-box-open text-sm"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500">Consumed Stock</p>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">{totalConsumed.toLocaleString()}</h3>
              </div>
              <div className="p-1.5 bg-orange-50 rounded-md text-orange-600">
                <i className="fa-solid fa-dolly text-sm"></i>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500">Capacity Utilization</p>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">{capacityPct}%</h3>
              </div>
              <div className="p-1.5 bg-purple-50 rounded-md text-purple-600">
                <i className="fa-solid fa-chart-line text-sm"></i>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
              <div className="bg-purple-500 h-1 rounded-full" style={{ width: `${capacityPct}%` }}></div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center">
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Branch */}
              <div className="relative w-full sm:w-48">
                <select
                  value={branchFilter}
                  onChange={e => setBranchFilter(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg block p-2 pr-8 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  <option value="">All Branches</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <i className="fa-solid fa-chevron-down text-xs"></i>
                </div>
              </div>

              {/* Category */}
              <div className="relative w-full sm:w-44">
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg block p-2 pr-8 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <i className="fa-solid fa-filter text-xs"></i>
                </div>
              </div>

              {/* Status */}
              <div className="relative w-full sm:w-40">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg block p-2 pr-8 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  <option value="">All Status</option>
                  <option value="normal">Normal Stock</option>
                  <option value="low">Low Stock</option>
                  <option value="critical">Critical Stock</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <i className="fa-solid fa-circle-exclamation text-xs"></i>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <i className="fa-solid fa-magnifying-glass text-gray-400 text-sm"></i>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg block w-full pl-9 p-2 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  placeholder="Search items, branches..."
                />
              </div>

              {/* Refresh */}
              <button
                onClick={fetchData}
                className="text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 font-medium rounded-lg text-xs px-3 py-2 inline-flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-arrows-rotate text-gray-400"></i>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 min-w-[800px]">
              <thead className="text-[11px] text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Branch Name</th>
                  <th className="px-4 py-2.5 font-semibold">Item Details</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Available</th>
                  <th className="px-4 py-2.5 font-semibold text-right hidden md:table-cell">Consumed</th>
                  <th className="px-4 py-2.5 font-semibold text-right hidden lg:table-cell">Max Limit</th>
                  <th className="px-4 py-2.5 font-semibold text-right hidden xl:table-cell">Remaining</th>
                  <th className="px-4 py-2.5 font-semibold text-center">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-xs">
                      <i className="fa-solid fa-spinner animate-spin mr-2"></i>Loading branch stock...
                    </td>
                  </tr>
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-xs">
                      {searchTerm || branchFilter || categoryFilter || statusFilter
                        ? 'No items match your filters.'
                        : 'No branch stock data found.'}
                    </td>
                  </tr>
                ) : pagedRows.map(row => {
                  const cfg = statusConfig[row.status]
                  return (
                    <tr
                      key={row.id}
                      onClick={() => openDrawer(row)}
                      className="bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{row.branchName}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                            {row.itemImageUrl ? (
                              <img src={row.itemImageUrl} alt={row.itemName} className="w-full h-full object-cover" />
                            ) : (
                              <i className="fa-solid fa-box text-sm"></i>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate text-xs">{row.itemName}</div>
                            <div className="text-[10px] text-gray-400 truncate">{row.categoryName} &middot; {row.itemUnit}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900 text-xs">{row.available.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500 text-xs hidden md:table-cell">{row.consumed.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500 text-xs hidden lg:table-cell">{row.maxLimit.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500 text-xs hidden xl:table-cell">{row.remaining.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                          <i className="fa-solid fa-chevron-right text-xs"></i>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{filteredRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * PAGE_SIZE, filteredRows.length)}</span> of{' '}
                <span className="font-medium">{filteredRows.length}</span> results
              </p>
              <nav className="inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <i className="fa-solid fa-chevron-left text-xs"></i>
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === pageNum
                          ? 'z-10 bg-red-50 border-red-500 text-red-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <i className="fa-solid fa-chevron-right text-xs"></i>
                </button>
              </nav>
            </div>
            {/* Mobile pagination */}
            <div className="flex items-center justify-between w-full sm:hidden">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}></div>
      )}

      {/* Stock Details Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-[70] w-full sm:w-[480px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Stock Details</h2>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Drawer Content */}
        {selectedRow && (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            {/* Item Header */}
            <div className="flex gap-4 items-start">
              <div className="h-20 w-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                {selectedRow.itemImageUrl ? (
                  <img src={selectedRow.itemImageUrl} alt={selectedRow.itemName} className="w-full h-full object-cover" />
                ) : (
                  <i className="fa-solid fa-box text-3xl text-gray-400"></i>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700">
                    {selectedRow.categoryName}
                  </span>
                  {(() => {
                    const cfg = statusConfig[selectedRow.status]
                    return (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    )
                  })()}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{selectedRow.itemName}</h3>
                <p className="text-sm text-gray-500">Unit: <span className="font-medium text-gray-700">{selectedRow.itemUnit}</span></p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Available Qty</p>
                <p className="text-2xl font-bold text-gray-900">{selectedRow.available.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Consumed</p>
                <p className="text-2xl font-bold text-gray-900">{selectedRow.consumed.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Max Limit</p>
                <p className="text-2xl font-bold text-gray-900">{selectedRow.maxLimit.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Remaining Cap</p>
                <p className="text-2xl font-bold text-gray-900">{selectedRow.remaining.toLocaleString()}</p>
              </div>
            </div>

            {/* Utilization Progress */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <h4 className="text-sm font-semibold text-gray-900">Stock Utilization</h4>
                <span className="text-sm font-bold text-red-600">{utilizationPct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full ${
                    utilizationPct > 70 ? 'bg-green-500' : utilizationPct > 30 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${utilizationPct}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Current stock is {utilizationPct}% of the maximum branch capacity.
              </p>
            </div>

            {/* Branch Info */}
            <div className="border-t border-gray-100 pt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Branch Information</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Branch Name</span>
                  <span className="text-sm font-medium text-gray-900">{selectedRow.branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Item</span>
                  <span className="text-sm font-medium text-gray-900">{selectedRow.itemName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Category</span>
                  <span className="text-sm font-medium text-gray-900">{selectedRow.categoryName}</span>
                </div>
                {selectedRow.itemDescription && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Description</span>
                    <span className="text-sm font-medium text-gray-900 text-right max-w-[200px]">{selectedRow.itemDescription}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
