"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useBranchFilter } from '@/hooks/use-branch-filter'

interface RequisitionRow {
  id: string
  requestNumber: string
  status: string
  created_at: string
  agingDays: number
  requester: { name: string; email: string }
  branch: string
  category: string
}

const statusMap: Record<string, string> = {
  pending_rm_approval: 'Pending RM Approval',
  pending_hr_approval: 'Pending HR Approval',
  pending_for_dispatch: 'Pending For Dispatch',
  ready_for_dispatch: 'Ready for Dispatch',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  rejected: 'Rejected',
}

const statusColors: Record<string, { bg: string; text: string }> = {
  'Pending RM Approval': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'Pending HR Approval': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'Pending For Dispatch': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'Ready for Dispatch': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Dispatched': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'Delivered': { bg: 'bg-green-100', text: 'text-green-700' },
  'Rejected': { bg: 'bg-red-100', text: 'text-red-700' },
}

export default function RequisitionsPage() {
  const supabase = createClient()
  const router = useRouter()
  const { selectedBranchId } = useBranchFilter()
  const [user, setUser] = useState<User | null>(null)
  const [requisitions, setRequisitions] = useState<RequisitionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    branches: [] as string[],
    statuses: [] as string[],
    dateFrom: '',
    dateTo: '',
    category: 'All Categories',
  })

  const fetchRequisitions = useCallback(async () => {
    setLoading(true)
    setFetchError(null)

    // Fetch current user
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

    let query = supabase
      .from('stock_requests')
      .select(`
        id,
        request_number,
        status,
        created_at,
        requester:users!requested_by ( full_name, email ),
        branch:branches!branch_id ( name ),
        category:categories!category_id ( name )
      `)
      .order('created_at', { ascending: false })

    if (selectedBranchId) {
      query = query.eq('branch_id', selectedBranchId)
    }

    const { data, error } = await query

    if (error) {
      setFetchError('Failed to load requisitions. Please try again.')
      setRequisitions([])
    } else {
      setRequisitions((data || []).map((r: any) => {
        const days = Math.max(0, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000))
        return {
          id: r.id,
          requestNumber: r.request_number || r.id.slice(0, 8),
          status: statusMap[r.status] || r.status,
          created_at: r.created_at,
          agingDays: days,
          requester: {
            name: r.requester?.full_name || 'Unknown',
            email: r.requester?.email || '',
          },
          branch: r.branch?.name || '—',
          category: r.category?.name || '—',
        }
      }))
    }
    setLoading(false)
  }, [supabase, selectedBranchId])

  useEffect(() => { fetchRequisitions() }, [fetchRequisitions])

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
    if (selectedRows.size === requisitions.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(requisitions.map((r) => r.id)))
    }
  }

  const getStatusColor = (status: string) => {
    return statusColors[status] || statusColors.Pending
  }

  const filteredRequisitions = requisitions.filter((req) => {
    const matchesSearch =
      !searchTerm ||
      req.requester.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requester.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">All Requisitions</h1>
              <p className="text-gray-600">Manage and track all requisition requests across branches</p>
            </div>
            <button
              onClick={() => router.push('/requisitions/new')}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all flex items-center space-x-2"
            >
              <i className="fa-solid fa-plus"></i>
              <span>New Requisition</span>
            </button>
          </div>
        </div>

        {/* Bulk Toolbar */}
        {selectedRows.size > 0 && (
          <div className="fixed top-16 left-64 right-0 bg-blue-600 text-white px-8 py-3 flex items-center justify-between z-40 shadow-lg">
            <div className="flex items-center space-x-4">
              <span className="font-semibold">{selectedRows.size} selected</span>
              <button className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-all">
                <i className="fa-solid fa-check mr-2"></i>Bulk Approve
              </button>
              <button className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-all">
                <i className="fa-solid fa-times mr-2"></i>Bulk Reject
              </button>
              <button className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-all">
                <i className="fa-solid fa-download mr-2"></i>Export
              </button>
              <button className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-all">
                <i className="fa-solid fa-user-pen mr-2"></i>Reassign
              </button>
            </div>
            <button
              onClick={() => setSelectedRows(new Set())}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
            >
              <i className="fa-solid fa-times"></i>
            </button>
          </div>
        )}

        {/* Filter Section */}
        <div className="bg-white border border-gray-200 rounded-xl mb-6">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
              >
                <i className="fa-solid fa-filter text-gray-600"></i>
                <span className="font-medium text-gray-700">Filters</span>
                <span className="bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">3</span>
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Saved filters:</span>
                <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all">
                  Pending Approvals
                </button>
                <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all">
                  Urgent Items
                </button>
                <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all">
                  This Month
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm w-64"
                />
              </div>
              <button onClick={fetchRequisitions} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                <i className="fa-solid fa-arrows-rotate text-gray-600"></i>
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-white">
              <div className="p-6 grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                <div className="space-y-2">
                  {['Branch A', 'Branch B', 'Branch C', 'Branch D'].map((branch) => (
                    <label key={branch} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.branches.includes(branch)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({
                              ...filters,
                              branches: [...filters.branches, branch],
                            })
                          } else {
                            setFilters({
                              ...filters,
                              branches: filters.branches.filter((b) => b !== branch),
                            })
                          }
                        }}
                        className="w-4 h-4 text-red-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{branch}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="flex flex-wrap gap-2">
                  {['Pending', 'Approved', 'In Progress', 'Rejected'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        if (filters.statuses.includes(status)) {
                          setFilters({
                            ...filters,
                            statuses: filters.statuses.filter((s) => s !== status),
                          })
                        } else {
                          setFilters({
                            ...filters,
                            statuses: [...filters.statuses, status],
                          })
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        filters.statuses.includes(status)
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2" />
                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option>All Categories</option>
                  <option>Office Supplies</option>
                  <option>IT Equipment</option>
                  <option>Furniture</option>
                  <option>Maintenance</option>
                </select>
              </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <button className="text-sm text-gray-600 hover:text-gray-800 font-medium">Reset all filters</button>
                <div className="flex items-center space-x-3">
                  <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-all">
                    Cancel
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all">
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === requisitions.length && requisitions.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-red-600 rounded cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center space-x-2">
                      <span>Request No</span>
                      <i className="fa-solid fa-sort text-gray-400"></i>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center space-x-2">
                      <span>Employee</span>
                      <i className="fa-solid fa-sort text-gray-400"></i>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center space-x-2">
                      <span>Branch</span>
                      <i className="fa-solid fa-sort text-gray-400"></i>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center space-x-2">
                      <span>Category</span>
                      <i className="fa-solid fa-sort text-gray-400"></i>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center space-x-2">
                      <span>Status</span>
                      <i className="fa-solid fa-sort text-gray-400"></i>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center space-x-2">
                      <span>Requested Date</span>
                      <i className="fa-solid fa-sort text-gray-400"></i>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center space-x-2">
                      <span>Aging Days</span>
                      <i className="fa-solid fa-sort text-gray-400"></i>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500 text-sm">
                      <i className="fa-solid fa-spinner animate-spin mr-2"></i>Loading...
                    </td>
                  </tr>
                ) : fetchError ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-red-600 text-sm">
                      <i className="fa-solid fa-circle-exclamation mr-2"></i>{fetchError}
                    </td>
                  </tr>
                ) : filteredRequisitions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500 text-sm">
                      No requisitions found
                    </td>
                  </tr>
                ) : filteredRequisitions.map((req) => {
                  const statusColor = getStatusColor(req.status)
                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-gray-50 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                    >
                      <td className="px-3 py-1.5">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(req.id)}
                          onChange={() => toggleRow(req.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-red-600 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="text-[11px] font-semibold text-gray-800 whitespace-nowrap">{req.requestNumber}</span>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center">
                          <div>
                            <div className="text-[11px] font-medium text-gray-800">{req.requester.name}</div>
                            <div className="text-[10px] text-gray-500">{req.requester.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="text-[11px] text-gray-700">{req.branch}</span>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="text-[11px] text-gray-700">{req.category}</span>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusColor.bg} ${statusColor.text}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="text-[11px] text-gray-600">
                          {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`text-[11px] font-semibold ${req.agingDays > 10 ? 'text-red-600' : 'text-gray-600'}`}>
                          {req.agingDays} days
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {req.status === 'Pending' && (
                            <>
                              <button className="p-1.5 hover:bg-gray-100 rounded-md transition-all" title="Approve">
                                <i className="fa-solid fa-check text-green-600"></i>
                              </button>
                              <button className="p-1.5 hover:bg-gray-100 rounded-md transition-all" title="Reject">
                                <i className="fa-solid fa-times text-red-600"></i>
                              </button>
                            </>
                          )}
                          {req.status === 'Approved' && (
                            <button className="p-1.5 hover:bg-gray-100 rounded-md transition-all" title="View">
                              <i className="fa-solid fa-eye text-gray-600"></i>
                            </button>
                          )}
                          <button className="p-1.5 hover:bg-gray-100 rounded-md transition-all" title="More">
                            <i className="fa-solid fa-ellipsis-vertical text-gray-600"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between">
            <div className="text-[11px] text-gray-600">Showing {filteredRequisitions.length} of {requisitions.length} requisitions</div>
            <div className="flex items-center space-x-2">
              <button className="px-2.5 py-1.5 border border-gray-300 rounded-md text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition-all">
                Previous
              </button>
              <button className="px-2.5 py-1.5 border border-gray-300 rounded-md text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition-all">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

    </>
  )
}
